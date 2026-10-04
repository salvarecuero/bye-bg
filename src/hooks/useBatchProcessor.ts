import { useState, useCallback, useRef, useEffect } from "react";
import type { BatchItem, BatchItemStatus } from "../types/batch";
import { createId } from "../lib/id";
import { clampPasses, MAX_BATCH_ITEMS } from "../lib/processingLimits";

type WorkerMessage =
  | {
      id: string;
      type: "progress";
      payload: {
        phase: string;
        loaded?: number;
        total?: number;
        message?: string;
      };
    }
  | {
      id: string;
      type: "result";
      payload: {
        rgbaPngBytes: ArrayBuffer;
        width: number;
        height: number;
        timingMs: number;
      };
    }
  | { id: string; type: "error"; payload: { message: string } };

type ProcessingOptions = {
  tier: "fast" | "quality" | "pro";
  refineEdges: boolean;
  bgMode: "transparent" | "color" | "image";
  bgColor: string;
  bgImageBytes?: ArrayBuffer;
  exportFormat: "png" | "webp";
  device: "auto" | "gpu" | "cpu";
  passes: number;
};

function commitItems(
  setter: React.Dispatch<React.SetStateAction<BatchItem[]>>,
  itemsRef: React.MutableRefObject<BatchItem[]>,
  updater: (prev: BatchItem[]) => BatchItem[],
) {
  setter((prev) => {
    const next = updater(prev);
    itemsRef.current = next;
    return next;
  });
}

export function useBatchProcessor(
  worker: React.RefObject<Worker | null>,
  options: ProcessingOptions,
) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectedCount, setRejectedCount] = useState(0);
  const processingRef = useRef(false);
  const optionsRef = useRef(options);
  const itemsRef = useRef<BatchItem[]>([]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const processNextItem = useCallback(() => {
    if (!processingRef.current || !worker.current) return;

    const current = itemsRef.current;
    const nextItem = current.find((item) => item.status === "pending");
    if (!nextItem) {
      setIsProcessing(false);
      processingRef.current = false;
      return;
    }

    commitItems(setItems, itemsRef, (prev) =>
      prev.map((it) =>
        it.id === nextItem.id
          ? { ...it, status: "processing" as BatchItemStatus, error: undefined }
          : it,
      ),
    );

    const opts = optionsRef.current;
    const imageBytes = nextItem.inputBytes.slice(0);
    const bgImageBytes = opts.bgImageBytes?.slice(0);
    const transfer: Transferable[] = [imageBytes];
    if (bgImageBytes) transfer.push(bgImageBytes);

    worker.current.postMessage(
      {
        id: nextItem.id,
        type: "process",
        payload: {
          image: {
            kind: "blob",
            mime: nextItem.file.type,
            bytes: imageBytes,
          },
          options: {
            tier: opts.tier,
            refineEdges: opts.refineEdges,
            bgMode: bgImageBytes ? "image" : opts.bgMode,
            bgColor: opts.bgColor,
            bgImageBytes,
            exportFormat: opts.exportFormat,
            device: opts.device,
            passes: clampPasses(opts.passes),
          },
        },
      },
      transfer,
    );
  }, [worker]);

  const startProcessing = useCallback(() => {
    if (processingRef.current) return;
    const hasPending = itemsRef.current.some((i) => i.status === "pending");
    if (!hasPending) return;
    processingRef.current = true;
    setIsProcessing(true);
    processNextItem();
  }, [processNextItem]);

  const addFiles = useCallback(
    async (files: File[], opts?: { autoStart?: boolean }) => {
      const newItems: BatchItem[] = await Promise.all(
        files.map(async (file) => {
          const inputBytes = await file.arrayBuffer();
          const thumbnailUrl = URL.createObjectURL(
            new Blob([inputBytes], { type: file.type }),
          );

          return {
            id: createId(),
            file,
            originalName: file.name,
            thumbnailUrl,
            inputBytes,
            status: "pending" as BatchItemStatus,
          };
        }),
      );

      // Compute next queue synchronously — after `await`, React may defer
      // setState updaters, so we must not rely on them to refresh itemsRef
      // before auto-start.
      const prev = itemsRef.current;
      const room = MAX_BATCH_ITEMS - prev.length;
      if (room <= 0) {
        setRejectedCount(newItems.length);
        newItems.forEach((item) => URL.revokeObjectURL(item.thumbnailUrl));
        return;
      }

      const accepted = newItems.slice(0, room);
      setRejectedCount(newItems.length - accepted.length);
      newItems.slice(room).forEach((item) => {
        URL.revokeObjectURL(item.thumbnailUrl);
      });

      const next = [...prev, ...accepted];
      itemsRef.current = next;
      setItems(next);

      if (opts?.autoStart && accepted.length > 0) {
        setTimeout(() => startProcessing(), 0);
      }
    },
    [startProcessing],
  );

  const removeItem = useCallback((id: string) => {
    commitItems(setItems, itemsRef, (prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.thumbnailUrl);
        if (item.result?.outputUrl) {
          URL.revokeObjectURL(item.result.outputUrl);
        }
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    itemsRef.current.forEach((item) => {
      URL.revokeObjectURL(item.thumbnailUrl);
      if (item.result?.outputUrl) {
        URL.revokeObjectURL(item.result.outputUrl);
      }
    });
    itemsRef.current = [];
    setItems([]);
    setIsProcessing(false);
    processingRef.current = false;
    setRejectedCount(0);
  }, []);

  const stopProcessing = useCallback(() => {
    processingRef.current = false;
    setIsProcessing(false);
    commitItems(setItems, itemsRef, (prev) =>
      prev.map((it) =>
        it.status === "processing"
          ? {
              ...it,
              status: "pending" as BatchItemStatus,
              progress: undefined,
            }
          : it,
      ),
    );
  }, []);

  const requeueForNewSettings = useCallback(() => {
    processingRef.current = false;
    setIsProcessing(false);
    commitItems(setItems, itemsRef, (prev) =>
      prev.map((it) => {
        if (it.result?.outputUrl) {
          URL.revokeObjectURL(it.result.outputUrl);
        }
        return {
          ...it,
          status: "pending" as BatchItemStatus,
          progress: undefined,
          result: undefined,
          error: undefined,
        };
      }),
    );
  }, []);

  useEffect(() => {
    const w = worker.current;
    if (!w) return;

    const handleMessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;
      const item = itemsRef.current.find((it) => it.id === msg.id);
      if (!item) return;
      const itemId = item.id;

      if (msg.type === "progress") {
        const pct =
          msg.payload.loaded != null &&
          msg.payload.total != null &&
          msg.payload.total > 0
            ? (msg.payload.loaded / msg.payload.total) * 100
            : undefined;

        commitItems(setItems, itemsRef, (prev) =>
          prev.map((it) =>
            it.id === itemId
              ? { ...it, progress: { pct, message: msg.payload.message } }
              : it,
          ),
        );
      } else if (msg.type === "result") {
        const bytes = new Uint8Array(msg.payload.rgbaPngBytes);
        // Settings are locked while the queue runs, so this matches the request.
        const format = optionsRef.current.exportFormat;
        const blob = new Blob([bytes], {
          type: format === "webp" ? "image/webp" : "image/png",
        });
        const outputUrl = URL.createObjectURL(blob);

        commitItems(setItems, itemsRef, (prev) =>
          prev.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  status: "completed" as BatchItemStatus,
                  progress: undefined,
                  result: {
                    outputUrl,
                    format,
                    outputBytes: bytes,
                    timingMs: msg.payload.timingMs,
                    width: msg.payload.width,
                    height: msg.payload.height,
                  },
                }
              : it,
          ),
        );

        setTimeout(() => processNextItem(), 50);
      } else if (msg.type === "error") {
        commitItems(setItems, itemsRef, (prev) =>
          prev.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  status: "error" as BatchItemStatus,
                  progress: undefined,
                  error: msg.payload.message,
                }
              : it,
          ),
        );

        setTimeout(() => processNextItem(), 50);
      }
    };

    w.addEventListener("message", handleMessage);
    return () => w.removeEventListener("message", handleMessage);
  }, [worker, processNextItem]);

  const completedCount = items.filter((i) => i.status === "completed").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const pendingCount = items.filter((i) => i.status === "pending").length;

  return {
    items,
    isProcessing,
    completedCount,
    errorCount,
    pendingCount,
    rejectedCount,
    maxItems: MAX_BATCH_ITEMS,
    addFiles,
    removeItem,
    clearAll,
    startProcessing,
    stopProcessing,
    requeueForNewSettings,
  };
}
