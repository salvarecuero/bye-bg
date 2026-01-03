import { useEffect, useMemo, useRef, useState } from 'react';
import { Dropzone } from './lib/ui/Dropzone';
import { CompareSlider } from './lib/ui/CompareSlider';
import { SettingsPanel } from './lib/ui/SettingsPanel';
import { ProgressBar } from './lib/ui/ProgressBar';
import { detectWebGPU } from './lib/capabilities';
import clsx from 'clsx';
import { FiDownloadCloud, FiRotateCw, FiRefreshCw } from 'react-icons/fi';

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

const workerUrl = new URL('./workers/inferenceWorker.ts', import.meta.url);

function useInferenceWorker() {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(workerUrl, { type: 'module' });
    return () => workerRef.current?.terminate();
  }, []);

  return workerRef;
}

export default function App() {
  const worker = useInferenceWorker();
  const [quality, setQuality] = useState<'fast' | 'quality' | 'pro'>('quality');
  const [refine, setRefine] = useState(true);
  const [bgMode, setBgMode] = useState<'transparent' | 'color' | 'image'>('transparent');
  const [bgColor, setBgColor] = useState('#0f172a');
  const [bgImageBytes, setBgImageBytes] = useState<number[]>();
  const [bgImageUrl, setBgImageUrl] = useState<string>();
  const [exportFmt, setExportFmt] = useState<'png' | 'webp'>('png');
  const [inputUrl, setInputUrl] = useState<string>();
  const [outputUrl, setOutputUrl] = useState<string>();
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{ pct?: number; message?: string }>({});
  const [backendLabel, setBackendLabel] = useState('Detecting…');
  const [cachedImage, setCachedImage] = useState<{ bytes: number[]; mime: string }>();
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [capabilities, setCapabilities] = useState<{
    webgpu: boolean;
    fp16: boolean;
    recommended: 'fast' | 'quality' | 'pro';
  }>({ webgpu: false, fp16: false, recommended: 'quality' });

  useEffect(() => {
    detectWebGPU()
      .then(({ supported, shaderF16 }) => {
        const recommended: 'fast' | 'quality' | 'pro' = !supported
          ? 'fast'
          : shaderF16
            ? 'quality'
            : 'quality';
        setCapabilities({ webgpu: supported, fp16: shaderF16, recommended });
        setQuality(recommended);
        if (supported) {
          setBackendLabel(shaderF16 ? 'WebGPU FP16' : 'WebGPU FP32');
        } else {
          setBackendLabel('WASM');
        }
        setModelStatus('ready');
      })
      .catch(() => {
        setModelStatus('error');
        setBackendLabel('Error');
      });
  }, []);

  const currentRequestId = useRef<string | null>(null);

  useEffect(() => {
    const w = worker.current;
    if (!w) return;
    w.postMessage({
      id: 'init',
      type: 'init',
      payload: { tier: quality, preferFp16: true, refineEdgesDefault: refine }
    });
    const onMessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        // Show progress for current request or init messages
        if (msg.id === currentRequestId.current || msg.id === 'init') {
          setProgress({
            pct:
              msg.payload.loaded != null && msg.payload.total != null && msg.payload.total > 0
                ? (msg.payload.loaded / msg.payload.total) * 100
                : undefined,
            message: msg.payload.message
          });
        }
      } else if (msg.type === 'result') {
        // Only process result for current request
        if (msg.id === currentRequestId.current) {
          const bytes = new Uint8Array(msg.payload.rgbaPngBytes);
          const blob = new Blob([bytes], {
            type: exportFmt === 'webp' ? 'image/webp' : 'image/png'
          });
          const url = URL.createObjectURL(blob);
          setOutputUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setProcessing(false);
          setProgress({ message: `Processed in ${(msg.payload.timingMs / 1000).toFixed(2)}s` });
          currentRequestId.current = null;
        }
      } else if (msg.type === 'error') {
        // Only process error for current request
        if (msg.id === currentRequestId.current) {
          setProgress({ message: msg.payload.message });
          setProcessing(false);
          currentRequestId.current = null;
        }
      }
    };
    w.addEventListener('message', onMessage);
    return () => w.removeEventListener('message', onMessage);
  }, [worker, exportFmt]);

  const handleFile = async (file: File) => {
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
    setProgress({});

    if (!worker.current) return;
    const requestId = crypto.randomUUID();
    currentRequestId.current = requestId;
    setProcessing(true);
    setProgress({ message: 'Starting…' });
    worker.current.postMessage({
      id: requestId,
      type: 'process',
      payload: {
        image: { kind: 'blob', mime: file.type, bytes: imageBytes },
        options: {
          tier: quality,
          refineEdges: refine,
          bgMode: bgImageBytes ? 'image' : bgMode,
          bgColor,
          bgImageBytes,
          exportFormat: exportFmt
        }
      }
    });
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
    setProgress({ message: 'Reprocessing…' });
    worker.current.postMessage({
      id: requestId,
      type: 'process',
      payload: {
        image: { kind: 'blob', mime: cachedImage.mime, bytes: cachedImage.bytes },
        options: {
          tier: quality,
          refineEdges: refine,
          bgMode: bgImageBytes ? 'image' : bgMode,
          bgColor,
          bgImageBytes,
          exportFormat: exportFmt
        }
      }
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
    setBgMode('image');
  };

  const handleDownload = () => {
    if (!outputUrl) return;
    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = `bye-bg.${exportFmt === 'webp' ? 'webp' : 'png'}`;
    link.click();
  };

  const reset = () => {
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
    setProcessing(false);
    setProgress({});
  };

  const statusLabel = useMemo(() => {
    if (processing) return progress.message ?? 'Processing…';
    if (outputUrl) return 'Done';
    return 'Idle';
  }, [processing, progress.message, outputUrl]);

  return (
    <div className="min-h-screen bg-[#0b1221] px-4 py-8 md:p-10">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <Dropzone onFile={handleFile} disabled={processing} />

          <div className="rounded-3xl bg-[#0d1426] p-4 glass">
            <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
              <div>
                <div className="text-lg font-semibold text-white">
                  Before / After
                </div>
                <div className="text-xs text-slate-400">
                  {processing
                    ? 'Processing…'
                    : outputUrl
                      ? 'Drag handle to compare'
                      : 'Load an image to begin'}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-slate-800/80 px-2 py-1 text-slate-300">
                  {backendLabel}
                </span>
                <span className={clsx(
                  'rounded-full px-2 py-1',
                  processing
                    ? 'bg-amber-500/20 text-amber-400'
                    : outputUrl
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800/80 text-slate-400'
                )}>
                  {statusLabel}
                </span>
              </div>
            </div>

            <div className="aspect-[4/3]">
              <CompareSlider beforeUrl={inputUrl} afterUrl={outputUrl} />
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  disabled={!outputUrl}
                  className={clsx(
                    'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                    outputUrl
                      ? 'bg-accent text-slate-900 hover:bg-[#7ce4ff]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  )}
                >
                  <FiDownloadCloud /> Download
                </button>
                {cachedImage && outputUrl && (
                  <button
                    onClick={reprocess}
                    disabled={processing}
                    className={clsx(
                      'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
                      processing
                        ? 'border-slate-700 text-slate-500 cursor-not-allowed'
                        : 'border-accent text-accent hover:bg-accent/10'
                    )}
                  >
                    <FiRefreshCw className={processing ? 'animate-spin' : ''} /> Reprocess
                  </button>
                )}
                <button
                  onClick={reset}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
                >
                  <FiRotateCw /> Reset
                </button>
              </div>
              {progress.pct != null && (
                <span className="text-xs text-slate-400">
                  {Math.round(progress.pct)}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
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
            processing={processing}
            backendLabel={backendLabel}
            modelStatus={modelStatus}
            capabilities={capabilities}
          />

        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={bgInputRef}
          onChange={onBgImageChange}
        />

          <ProgressBar
            label="Processing"
            progress={progress.pct}
            message={progress.message}
          />
        </div>
      </div>
    </div>
  );
}

