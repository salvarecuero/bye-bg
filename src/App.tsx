import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dropzone } from "./lib/ui/Dropzone";
import { CompareSlider } from "./lib/ui/CompareSlider";
import { SettingsPanel } from "./lib/ui/SettingsPanel";
import { ProcessingPanel } from "./lib/ui/ProcessingPanel";
import { ActionButtons } from "./lib/ui/ActionButtons";
import { BatchLayout } from "./lib/ui/BatchLayout";
import { ShortcutsPanel } from "./lib/ui/ShortcutsPanel";
import { detectWebGPU } from "./lib/capabilities";
import { useKeyboardShortcuts } from "./lib/shortcuts";
import { useBatchProcessor } from "./hooks/useBatchProcessor";
import {
  downloadBatchItem,
  downloadAllSeparate,
  downloadAsZip,
} from "./lib/download";
import { copyImageToClipboard, isClipboardSupported } from "./lib/clipboard";
import type { ProcessingStats, ProcessingPhase } from "./types/processing";
import clsx from "clsx";
import { FiZap, FiCpu, FiUploadCloud } from "react-icons/fi";

type WorkerMessage =
  | {
      id: string;
      type: "progress";
      payload: {
        phase: string;
        loaded?: number;
        total?: number;
        message?: string;
        modelName?: string;
        timings?: { download?: number; inference?: number; composite?: number };
      };
    }
  | {
      id: string;
      type: "result";
      payload: {
        rgbaPngBytes: number[];
        width: number;
        height: number;
        timingMs: number;
        modelName?: string;
        timings?: {
          download?: number;
          inference?: number;
          composite?: number;
          total?: number;
        };
      };
    }
  | { id: string; type: "error"; payload: { message: string } };

const workerUrl = new URL("./workers/inferenceWorker.ts", import.meta.url);

function useInferenceWorker() {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(workerUrl, { type: "module" });
    return () => workerRef.current?.terminate();
  }, []);

  return workerRef;
}

export default function App() {
  const worker = useInferenceWorker();
  const [quality, setQuality] = useState<"fast" | "quality" | "pro">("quality");
  const [refine, setRefine] = useState(true);
  const [bgMode, setBgMode] = useState<"transparent" | "color" | "image">(
    "transparent"
  );
  const [bgColor, setBgColor] = useState("#0ea5e9");
  const [bgImageBytes, setBgImageBytes] = useState<number[]>();
  const [bgImageUrl, setBgImageUrl] = useState<string>();
  const [exportFmt, setExportFmt] = useState<"png" | "webp">("png");
  const [inputUrl, setInputUrl] = useState<string>();
  const [outputUrl, setOutputUrl] = useState<string>();
  const [processing, setProcessing] = useState(false);
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    phase: "idle",
    progress: 0,
    message: "",
  });
  const [backendLabel, setBackendLabel] = useState("Detecting…");
  const [cachedImage, setCachedImage] = useState<{
    bytes: number[];
    mime: string;
  }>();
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [capabilities, setCapabilities] = useState<{
    webgpu: boolean;
    fp16: boolean;
    recommended: "fast" | "quality" | "pro";
  }>({ webgpu: false, fp16: false, recommended: "quality" });
  const [device, setDevice] = useState<"auto" | "gpu" | "cpu">("auto");

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false);
  const [selectedBatchItemId, setSelectedBatchItemId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // File input ref for keyboard shortcut
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch processor
  const batchProcessor = useBatchProcessor(worker, {
    tier: quality,
    refineEdges: refine,
    bgMode,
    bgColor,
    bgImageBytes,
    exportFormat: exportFmt,
    device,
  });

  useEffect(() => {
    detectWebGPU()
      .then(({ supported, shaderF16 }) => {
        const recommended: "fast" | "quality" | "pro" = !supported
          ? "fast"
          : shaderF16
            ? "quality"
            : "quality";
        setCapabilities({ webgpu: supported, fp16: shaderF16, recommended });
        setQuality(recommended);
        if (supported) {
          setBackendLabel(shaderF16 ? "WebGPU FP16" : "WebGPU FP32");
        } else {
          setBackendLabel("WASM");
        }
        setModelStatus("ready");
      })
      .catch(() => {
        setModelStatus("error");
        setBackendLabel("Error");
      });
  }, []);

  // Update backend label when device selection changes
  useEffect(() => {
    if (modelStatus !== "ready") return; // Don't update during detection

    if (device === "cpu") {
      setBackendLabel("WASM");
    } else if (device === "gpu" || device === "auto") {
      if (capabilities.webgpu) {
        setBackendLabel(capabilities.fp16 ? "WebGPU FP16" : "WebGPU FP32");
      } else {
        setBackendLabel("WASM");
      }
    }
  }, [device, capabilities, modelStatus]);

  const currentRequestId = useRef<string | null>(null);

  useEffect(() => {
    const w = worker.current;
    if (!w) return;
    w.postMessage({
      id: "init",
      type: "init",
      payload: { tier: quality, preferFp16: true, refineEdgesDefault: refine },
    });
    const onMessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;

      // Skip batch messages (handled by useBatchProcessor)
      if (
        batchMode &&
        msg.id !== currentRequestId.current &&
        msg.id !== "init"
      ) {
        return;
      }

      if (msg.type === "progress") {
        if (msg.id === currentRequestId.current || msg.id === "init") {
          const pct =
            msg.payload.loaded != null &&
            msg.payload.total != null &&
            msg.payload.total > 0
              ? (msg.payload.loaded / msg.payload.total) * 100
              : undefined;

          setProcessingStats((prev) => ({
            ...prev,
            phase: (msg.payload.phase === "init"
              ? "idle"
              : msg.payload.phase) as ProcessingPhase,
            progress: pct ?? prev.progress,
            message: msg.payload.message ?? prev.message,
            modelName: msg.payload.modelName ?? prev.modelName,
            timings: msg.payload.timings ?? prev.timings,
          }));
        }
      } else if (msg.type === "result") {
        if (msg.id === currentRequestId.current) {
          const bytes = new Uint8Array(msg.payload.rgbaPngBytes);
          const blob = new Blob([bytes], {
            type: exportFmt === "webp" ? "image/webp" : "image/png",
          });
          const url = URL.createObjectURL(blob);
          setOutputUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setProcessing(false);
          setProcessingStats({
            phase: "complete",
            progress: 100,
            message: `Processed in ${(msg.payload.timingMs / 1000).toFixed(2)}s`,
            modelName: msg.payload.modelName,
            dimensions: {
              width: msg.payload.width,
              height: msg.payload.height,
            },
            timings: msg.payload.timings,
          });
          currentRequestId.current = null;
        }
      } else if (msg.type === "error") {
        if (msg.id === currentRequestId.current) {
          setProcessingStats((prev) => ({
            ...prev,
            phase: "error",
            message: msg.payload.message,
            error: msg.payload.message,
          }));
          setProcessing(false);
          currentRequestId.current = null;
        }
      }
    };
    w.addEventListener("message", onMessage);
    return () => w.removeEventListener("message", onMessage);
  }, [worker, exportFmt, batchMode]);

  const handleFile = async (file: File) => {
    // Switch to single mode if in batch mode
    if (batchMode) {
      setBatchMode(false);
      batchProcessor.clearAll();
    }

    const arr = new Uint8Array(await file.arrayBuffer());
    const imageBytes = Array.from(arr);
    setCachedImage({ bytes: imageBytes, mime: file.type });
    const url = URL.createObjectURL(new Blob([arr], { type: file.type }));
    setInputUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setOutputUrl(undefined);
    setProcessing(false);
    setProcessingStats({ phase: "idle", progress: 0, message: "" });

    if (!worker.current) return;
    const requestId = crypto.randomUUID();
    currentRequestId.current = requestId;
    setProcessing(true);
    setProcessingStats({
      phase: "download",
      progress: 0,
      message: "Starting…",
    });
    worker.current.postMessage({
      id: requestId,
      type: "process",
      payload: {
        image: { kind: "blob", mime: file.type, bytes: imageBytes },
        options: {
          tier: quality,
          refineEdges: refine,
          bgMode: bgImageBytes ? "image" : bgMode,
          bgColor,
          bgImageBytes,
          exportFormat: exportFmt,
          device,
        },
      },
    });
  };

  const handleFiles = (files: File[]) => {
    if (files.length === 1) {
      handleFile(files[0]);
    } else if (files.length > 1) {
      // Switch to batch mode
      setBatchMode(true);
      // Clear single mode state
      setInputUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return undefined;
      });
      setOutputUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return undefined;
      });
      setCachedImage(undefined);
      setProcessingStats({ phase: "idle", progress: 0, message: "" });

      batchProcessor.addFiles(files);
    }
  };

  const reprocess = () => {
    if (!cachedImage || !worker.current) return;
    setOutputUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return undefined;
    });
    const requestId = crypto.randomUUID();
    currentRequestId.current = requestId;
    setProcessing(true);
    setProcessingStats({
      phase: "download",
      progress: 0,
      message: "Reprocessing…",
    });
    worker.current.postMessage({
      id: requestId,
      type: "process",
      payload: {
        image: {
          kind: "blob",
          mime: cachedImage.mime,
          bytes: cachedImage.bytes,
        },
        options: {
          tier: quality,
          refineEdges: refine,
          bgMode: bgImageBytes ? "image" : bgMode,
          bgColor,
          bgImageBytes,
          exportFormat: exportFmt,
          device,
        },
      },
    });
  };

  const bgInputRef = useRef<HTMLInputElement | null>(null);

  const onBgImageUpload = () => {
    bgInputRef.current?.click();
  };

  const onBgImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const arr = new Uint8Array(await file.arrayBuffer());
    setBgImageBytes(Array.from(arr));
    const url = URL.createObjectURL(new Blob([arr], { type: file.type }));
    setBgImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setBgMode("image");
  };

  const handleDownload = useCallback(() => {
    if (!outputUrl) return;
    const link = document.createElement("a");
    link.href = outputUrl;
    link.download = `bye-bg.${exportFmt === "webp" ? "webp" : "png"}`;
    link.click();
  }, [outputUrl, exportFmt]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!outputUrl) return;
    try {
      const response = await fetch(outputUrl);
      const blob = await response.blob();
      await copyImageToClipboard(blob);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [outputUrl]);

  const reset = useCallback(() => {
    setInputUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return undefined;
    });
    setOutputUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return undefined;
    });
    setBgImageBytes(undefined);
    setBgImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return undefined;
    });
    setCachedImage(undefined);
    setProcessing(false);
    setProcessingStats({ phase: "idle", progress: 0, message: "" });

    // Also clear batch if in batch mode
    if (batchMode) {
      batchProcessor.clearAll();
      setBatchMode(false);
      setSelectedBatchItemId(null);
    }
  }, [batchMode, batchProcessor]);

  const handleOpenFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Keyboard shortcuts
  const appState = useMemo(
    () => ({
      processing: processing || batchProcessor.isProcessing,
      hasOutput: !!outputUrl,
      hasInput: !!inputUrl,
      hasCachedImage: !!cachedImage,
    }),
    [processing, batchProcessor.isProcessing, outputUrl, inputUrl, cachedImage]
  );

  useKeyboardShortcuts(
    {
      download: handleDownload,
      copy: handleCopyToClipboard,
      reset,
      reprocess,
      upload: handleOpenFileDialog,
      help: () => setShowShortcuts((prev) => !prev),
    },
    appState,
    true
  );

  // Full-screen drop zone
  const { getRootProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    multiple: true,
    accept: { "image/*": [] },
    noClick: true,
    noKeyboard: true,
    disabled: processing,
  });

  const statusLabel = useMemo(() => {
    if (processing) return processingStats.message || "Processing…";
    if (outputUrl) return "Done";
    return "Idle";
  }, [processing, processingStats.message, outputUrl]);

  const isAnyProcessing = processing || batchProcessor.isProcessing;

  return (
    <div
      {...getRootProps()}
      className="h-screen overflow-hidden bg-[#0b1221] flex flex-col relative"
    >
      {/* Full-screen drop overlay */}
      <div
        className={clsx(
          "fixed inset-0 z-40 flex items-center justify-center pointer-events-none",
          "transition-all duration-200",
          isDragActive ? "opacity-100" : "opacity-0"
        )}
      >
        <div
          className={clsx(
            "absolute inset-4 rounded-3xl border-2 border-dashed",
            "bg-black/60 backdrop-blur-md",
            "flex flex-col items-center justify-center gap-4",
            isDragActive ? "border-accent shadow-glow" : "border-transparent"
          )}
        >
          <div className="rounded-full bg-accent/20 p-6">
            <FiUploadCloud className="h-16 w-16 text-accent" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-white">
              Drop images here
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Release to remove backgrounds
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto px-4 py-6 md:px-10 md:py-8">
        {/* Screen reader announcer */}
        <div
          id="sr-announcer"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {/* Hidden file input for keyboard shortcut */}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              handleFiles(Array.from(files));
            }
            e.target.value = "";
          }}
        />

        <div className="mx-auto max-w-6xl w-full flex-1 flex flex-col">
          {/* Header with logo - aligned with content */}
          <header className="pb-4 md:pb-5">
            <a
              href="/"
              className="group inline-flex items-baseline text-2xl font-bold tracking-tight transition-all"
            >
              <span className="text-white">bye</span>
              <span className="text-accent group-hover:drop-shadow-[0_0_8px_rgba(14,165,233,0.5)] transition-all">
                -bg
              </span>
            </a>
          </header>

          {/* Main content - vertically centered */}
          <div className="flex-1 flex items-center">
            <div className={clsx(
              "grid w-full gap-4 lg:gap-5 lg:grid-cols-[3fr,2fr] xl:grid-cols-[2fr,1fr]",
              batchMode && "items-center"
            )}>
              <div className="space-y-4 min-w-0">
            {/* Show Dropzone or BatchLayout based on mode */}
            {batchMode ? (
              <BatchLayout
                items={batchProcessor.items}
                selectedItemId={selectedBatchItemId}
                onSelectItem={setSelectedBatchItemId}
                isProcessing={batchProcessor.isProcessing}
                completedCount={batchProcessor.completedCount}
                errorCount={batchProcessor.errorCount}
                exportFormat={exportFmt}
                onAddFiles={batchProcessor.addFiles}
                onRemoveItem={batchProcessor.removeItem}
                onClearAll={() => {
                  batchProcessor.clearAll();
                  setBatchMode(false);
                  setSelectedBatchItemId(null);
                }}
                onStartProcessing={batchProcessor.startProcessing}
                onStopProcessing={batchProcessor.stopProcessing}
                onDownloadItem={(item) => downloadBatchItem(item, exportFmt)}
                onDownloadAll={() =>
                  downloadAllSeparate(batchProcessor.items, exportFmt)
                }
                onDownloadZip={() =>
                  downloadAsZip(batchProcessor.items, exportFmt)
                }
              />
            ) : (
              <>
                <Dropzone
                  onFile={handleFile}
                  onFiles={handleFiles}
                  multiple
                  disabled={processing}
                />

                <div className="rounded-3xl bg-[#0d1426] p-4 glass">
                  <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
                    <div>
                      <div className="text-lg font-semibold text-white">
                        Before / After
                      </div>
                      <div className="text-xs text-slate-400">
                        {processing
                          ? "Processing…"
                          : outputUrl
                            ? "Drag handle to compare"
                            : "Load an image to begin"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {/* Backend chip with icon */}
                      <span className="flex items-center gap-1.5 rounded-full bg-slate-800/90 border border-slate-700/50 px-2.5 py-1 text-slate-200">
                        {backendLabel.includes("WebGPU") ? (
                          <FiZap className="h-3 w-3 text-accent" />
                        ) : (
                          <FiCpu className="h-3 w-3 text-slate-400" />
                        )}
                        {backendLabel}
                      </span>

                      {/* Status chip with glow */}
                      <span
                        className={clsx(
                          "flex items-center gap-1.5 rounded-full px-2.5 py-1 border",
                          processing
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                            : outputUrl
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                              : "bg-slate-800/90 border-slate-700/50 text-slate-400"
                        )}
                      >
                        {/* Status indicator dot */}
                        <span
                          className={clsx(
                            "h-1.5 w-1.5 rounded-full",
                            processing && "bg-amber-400 animate-pulse",
                            outputUrl && !processing && "bg-emerald-400",
                            !outputUrl && !processing && "bg-slate-500"
                          )}
                        />
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="aspect-[4/3] md:aspect-[16/10]">
                    <CompareSlider
                      beforeUrl={inputUrl}
                      afterUrl={outputUrl}
                      processing={processing}
                    />
                  </div>

                  <div className="mt-4">
                    <ActionButtons
                      outputUrl={outputUrl}
                      exportFormat={exportFmt}
                      canReprocess={!!cachedImage && !!outputUrl}
                      processing={processing}
                      onDownload={handleDownload}
                      onReprocess={reprocess}
                      onReset={reset}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3 min-w-0">
            <SettingsPanel
              quality={quality}
              onQuality={setQuality}
              refine={refine}
              onRefine={setRefine}
              bgMode={bgMode}
              onBgMode={setBgMode}
              bgColor={bgColor}
              onBgColor={setBgColor}
              exportFormat={exportFmt}
              onExportFormat={setExportFmt}
              onBgImageUpload={onBgImageUpload}
              processing={isAnyProcessing}
              backendLabel={backendLabel}
              modelStatus={modelStatus}
              capabilities={capabilities}
              device={device}
              onDevice={setDevice}
            />

            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={bgInputRef}
              onChange={onBgImageChange}
            />

            <ProcessingPanel
              stats={processingStats}
              backendLabel={backendLabel}
            />

            {/* Mode toggle hint */}
            {!batchMode && inputUrl && (
              <div className="text-center text-xs text-slate-500">
                Drop multiple images to enable batch mode
              </div>
            )}
          </div>
            </div>
          </div>
        </div>

        {/* Shortcuts Help Panel */}
        <ShortcutsPanel
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
      </div>

      {/* Credits Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-700/30">
        Created with <span className="text-red-400">❤️</span> by{" "}
        <a
          href="https://salvarecuero.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accentHover transition-colors"
        >
          @salvarecuero
        </a>
      </footer>
    </div>
  );
}
