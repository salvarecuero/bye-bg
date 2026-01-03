import { useState, useCallback, useRef, useEffect } from 'react';
import type { BatchItem, BatchItemStatus } from '../types/batch';

type WorkerMessage =
  | {
      id: string;
      type: 'progress';
      payload: { phase: string; loaded?: number; total?: number; message?: string };
    }
  | {
      id: string;
      type: 'result';
      payload: {
        rgbaPngBytes: number[];
        width: number;
        height: number;
        timingMs: number;
      };
    }
  | { id: string; type: 'error'; payload: { message: string } };

type ProcessingOptions = {
  tier: 'fast' | 'quality' | 'pro';
  refineEdges: boolean;
  bgMode: 'transparent' | 'color' | 'image';
  bgColor: string;
  bgImageBytes?: number[];
  exportFormat: 'png' | 'webp';
  device: 'auto' | 'gpu' | 'cpu';
};

export function useBatchProcessor(
  worker: React.RefObject<Worker | null>,
  options: ProcessingOptions
) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const processingRef = useRef(false);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const addFiles = useCallback(async (files: File[]) => {
    const newItems: BatchItem[] = await Promise.all(
      files.map(async file => {
        const arr = new Uint8Array(await file.arrayBuffer());
        const thumbnailUrl = URL.createObjectURL(new Blob([arr], { type: file.type }));

        return {
          id: crypto.randomUUID(),
          file,
          originalName: file.name,
          thumbnailUrl,
          inputBytes: Array.from(arr),
          status: 'pending' as BatchItemStatus
        };
      })
    );

    setItems(prev => [...prev, ...newItems]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.thumbnailUrl);
        if (item.result?.outputUrl) {
          URL.revokeObjectURL(item.result.outputUrl);
        }
      }
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems(prev => {
      prev.forEach(item => {
        URL.revokeObjectURL(item.thumbnailUrl);
        if (item.result?.outputUrl) {
          URL.revokeObjectURL(item.result.outputUrl);
        }
      });
      return [];
    });
    setIsProcessing(false);
    setCurrentIndex(-1);
    processingRef.current = false;
  }, []);

  const processNextItem = useCallback(() => {
    if (!processingRef.current || !worker.current) return;

    const nextIndex = items.findIndex(item => item.status === 'pending');
    if (nextIndex === -1) {
      setIsProcessing(false);
      setCurrentIndex(-1);
      processingRef.current = false;
      return;
    }

    setCurrentIndex(nextIndex);
    const item = items[nextIndex];

    setItems(prev =>
      prev.map((it, i) => (i === nextIndex ? { ...it, status: 'processing' as BatchItemStatus } : it))
    );

    const opts = optionsRef.current;
    worker.current.postMessage({
      id: item.id,
      type: 'process',
      payload: {
        image: { kind: 'blob', mime: item.file.type, bytes: item.inputBytes },
        options: {
          tier: opts.tier,
          refineEdges: opts.refineEdges,
          bgMode: opts.bgImageBytes ? 'image' : opts.bgMode,
          bgColor: opts.bgColor,
          bgImageBytes: opts.bgImageBytes,
          exportFormat: opts.exportFormat,
          device: opts.device
        }
      }
    });
  }, [items, worker]);

  const startProcessing = useCallback(() => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    processNextItem();
  }, [processNextItem]);

  const stopProcessing = useCallback(() => {
    processingRef.current = false;
    setIsProcessing(false);
    setCurrentIndex(-1);
  }, []);

  // Handle worker messages
  useEffect(() => {
    const w = worker.current;
    if (!w) return;

    const handleMessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;

      // Find item by request ID
      const itemIndex = items.findIndex(item => item.id === msg.id);
      if (itemIndex === -1) return;

      if (msg.type === 'progress') {
        const pct =
          msg.payload.loaded != null && msg.payload.total != null && msg.payload.total > 0
            ? (msg.payload.loaded / msg.payload.total) * 100
            : undefined;

        setItems(prev =>
          prev.map((it, i) =>
            i === itemIndex
              ? { ...it, progress: { pct, message: msg.payload.message } }
              : it
          )
        );
      } else if (msg.type === 'result') {
        const bytes = new Uint8Array(msg.payload.rgbaPngBytes);
        const blob = new Blob([bytes], {
          type: optionsRef.current.exportFormat === 'webp' ? 'image/webp' : 'image/png'
        });
        const outputUrl = URL.createObjectURL(blob);

        setItems(prev =>
          prev.map((it, i) =>
            i === itemIndex
              ? {
                  ...it,
                  status: 'completed' as BatchItemStatus,
                  progress: undefined,
                  result: {
                    outputUrl,
                    outputBytes: bytes,
                    timingMs: msg.payload.timingMs,
                    width: msg.payload.width,
                    height: msg.payload.height
                  }
                }
              : it
          )
        );

        // Process next item
        setTimeout(() => processNextItem(), 100);
      } else if (msg.type === 'error') {
        setItems(prev =>
          prev.map((it, i) =>
            i === itemIndex
              ? {
                  ...it,
                  status: 'error' as BatchItemStatus,
                  progress: undefined,
                  error: msg.payload.message
                }
              : it
          )
        );

        // Continue with next item (error handling: continue on error)
        setTimeout(() => processNextItem(), 100);
      }
    };

    w.addEventListener('message', handleMessage);
    return () => w.removeEventListener('message', handleMessage);
  }, [worker, items, processNextItem]);

  const completedCount = items.filter(i => i.status === 'completed').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const totalCount = items.length;

  return {
    items,
    isProcessing,
    currentIndex,
    completedCount,
    errorCount,
    totalCount,
    addFiles,
    removeItem,
    clearAll,
    startProcessing,
    stopProcessing
  };
}
