import clsx from 'clsx';
import { Switch } from '@headlessui/react';
import { FiAlertTriangle, FiInfo, FiCpu, FiZap } from 'react-icons/fi';
import { ColorPicker } from './ColorPicker';
import { Tooltip } from './Tooltip';

type Quality = 'fast' | 'quality' | 'pro';
type ExportFormat = 'png' | 'webp';
type BackgroundMode = 'transparent' | 'color' | 'image';
type ModelStatus = 'loading' | 'ready' | 'error';
type DevicePreference = 'auto' | 'gpu' | 'cpu';

type Capabilities = {
  webgpu: boolean;
  fp16: boolean;
  recommended: Quality;
};

type Props = {
  quality: Quality;
  onQuality: (value: Quality) => void;
  refine: boolean;
  onRefine: (v: boolean) => void;
  bgMode: BackgroundMode;
  onBgMode: (v: BackgroundMode) => void;
  bgColor: string;
  onBgColor: (v: string) => void;
  exportFormat: ExportFormat;
  onExportFormat: (v: ExportFormat) => void;
  onBgImageUpload?: () => void;
  processing: boolean;
  backendLabel: string;
  modelStatus: ModelStatus;
  capabilities: Capabilities;
  device: DevicePreference;
  onDevice: (v: DevicePreference) => void;
};

const qualities: { key: Quality; label: string; size: string; description: string }[] = [
  { key: 'fast', label: 'Fast', size: '~5MB', description: 'Lightweight quantized model. Quick results, slightly lower edge quality.' },
  { key: 'quality', label: 'Balanced', size: '~40MB', description: 'Balanced model for most images. Good quality with reasonable speed.' },
  { key: 'pro', label: 'Pro', size: '~180MB', description: 'High-precision model. Best for complex images with fine details like hair.' }
];

const backendDescriptions: Record<string, string> = {
  'WebGPU FP16': 'Uses your GPU with half-precision math for fastest processing. Best performance.',
  'WebGPU FP32': 'Uses your GPU with full-precision math. Good performance, slightly more accurate.',
  'WASM': 'Software-based CPU processing. Works everywhere but slower than GPU acceleration.'
};

const deviceOptions: { key: DevicePreference; label: string; icon: React.ReactNode }[] = [
  { key: 'auto', label: 'Auto', icon: <FiZap className="h-3.5 w-3.5" /> },
  { key: 'gpu', label: 'GPU', icon: <FiZap className="h-3.5 w-3.5" /> },
  { key: 'cpu', label: 'CPU', icon: <FiCpu className="h-3.5 w-3.5" /> }
];

export function SettingsPanel({
  quality,
  onQuality,
  refine,
  onRefine,
  bgMode,
  onBgMode,
  bgColor,
  onBgColor,
  exportFormat,
  onExportFormat,
  onBgImageUpload,
  processing,
  backendLabel,
  modelStatus,
  capabilities,
  device,
  onDevice
}: Props) {
  const getQualityWarning = (q: Quality): string | null => {
    if (q === capabilities.recommended) return null;
    if (q === 'pro' && !capabilities.fp16) return 'May be slow without FP16';
    if (q === 'fast' && capabilities.webgpu) return 'Lower quality than recommended';
    if (!capabilities.webgpu && q !== 'fast') return 'May be slow without WebGPU';
    return null;
  };
  const getDeviceWarning = (d: DevicePreference): string | null => {
    if (d === 'auto') return null;
    if (d === 'gpu' && !capabilities.webgpu) return 'GPU not available on this device';
    if (d === 'cpu' && capabilities.webgpu) return 'CPU is slower than GPU on this device';
    return null;
  };

  return (
    <div className="glass w-full rounded-3xl border border-white/5 p-4 shadow-panel">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-300">Engine</div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-white font-semibold">{backendLabel}</span>
            <Tooltip content={backendDescriptions[backendLabel] || 'AI execution engine'} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {modelStatus === 'loading' && (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              <span className="text-xs text-amber-400">Loading</span>
            </div>
          )}
          {modelStatus === 'ready' && (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-xs text-emerald-400">Ready</span>
            </div>
          )}
          {modelStatus === 'error' && (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-xs text-red-400">Error</span>
            </div>
          )}
        </div>
      </div>

      {/* Device Selection */}
      <div className="mt-4">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-sm text-slate-200 font-medium">Device</span>
          <Tooltip content="Choose which hardware to use for processing. Auto selects the best available option." />
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-900/50 p-1">
          {deviceOptions.map((opt) => {
            const warning = getDeviceWarning(opt.key);
            const isDisabled = opt.key === 'gpu' && !capabilities.webgpu;
            return (
              <button
                key={opt.key}
                className={clsx(
                  'relative flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition',
                  device === opt.key
                    ? 'bg-accent text-white'
                    : isDisabled
                      ? 'text-slate-500 cursor-not-allowed'
                      : 'text-slate-300 hover:bg-slate-800'
                )}
                onClick={() => !isDisabled && onDevice(opt.key)}
                disabled={isDisabled}
                title={warning || (opt.key === 'auto' ? 'Automatically selects the best option' : '')}
              >
                {opt.icon}
                <span>{opt.label}</span>
                {warning && device !== opt.key && !isDisabled && (
                  <FiAlertTriangle className="absolute -top-1 -right-1 h-3 w-3 text-amber-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-sm text-slate-200 font-medium">Model</span>
          <Tooltip content="Higher quality models produce better results but are larger to download." />
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-900/50 p-1">
          {qualities.map((q) => {
            const warning = getQualityWarning(q.key);
            const isRecommended = q.key === capabilities.recommended;
            return (
              <button
                key={q.key}
                className={clsx(
                  'relative flex flex-col items-center rounded-lg py-2 transition',
                  quality === q.key
                    ? 'bg-accent text-white'
                    : 'text-slate-200 hover:bg-slate-800'
                )}
                onClick={() => onQuality(q.key)}
                title={`${q.description}${warning ? ` (${warning})` : ''}${isRecommended ? ' — Recommended' : ''}`}
              >
                <span className="flex items-center gap-1 text-sm font-semibold">
                  {q.label}
                  {warning && quality !== q.key && (
                    <FiAlertTriangle className="h-3 w-3 text-amber-400" />
                  )}
                </span>
                <span className={clsx(
                  'text-[10px]',
                  quality === q.key ? 'text-white/70' : 'text-slate-500'
                )}>
                  {q.size}
                </span>
                {isRecommended && quality !== q.key && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-white font-semibold">Refine edges</span>
            <Tooltip content="Applies edge smoothing to reduce jagged artifacts around hair and fine details. Recommended for portraits." />
          </div>
          <div className="text-xs text-slate-300">
            Smooths hair/fine detail edges
          </div>
        </div>
        <Switch
          checked={refine}
          onChange={onRefine}
          className={clsx(
            'relative inline-flex h-6 w-11 items-center rounded-full transition',
            refine ? 'bg-accent' : 'bg-slate-700'
          )}
        >
          <span
            className={clsx(
              'inline-block h-4 w-4 transform rounded-full bg-white transition',
              refine ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </Switch>
      </div>

      <div className="mt-4 space-y-3">
        <div className="text-sm text-slate-200 font-medium">Background</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'transparent', label: 'Transparent' },
            { key: 'color', label: 'Solid color' },
            { key: 'image', label: 'Image' }
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => onBgMode(opt.key as BackgroundMode)}
              className={clsx(
                'rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                bgMode === opt.key
                  ? 'border-accent bg-accent/10 text-white'
                  : 'border-slate-600 text-slate-200 hover:border-slate-400 hover:text-white'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Show ColorPicker only when Solid color is selected */}
        {bgMode === 'color' && (
          <ColorPicker value={bgColor} onChange={onBgColor} />
        )}

        {/* Show upload only when Image is selected */}
        {bgMode === 'image' && (
          <button
            onClick={onBgImageUpload}
            className="w-full rounded-xl border border-slate-600 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 transition hover:border-accent hover:text-white"
          >
            Upload background image
          </button>
        )}
      </div>

      <div className="mt-4">
        <div className="text-sm text-slate-200 font-medium mb-2">Export</div>
        <div className="flex gap-3">
          {(['png', 'webp'] as ExportFormat[]).map((fmt) => (
            <button
              key={fmt}
              className={clsx(
                'flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                exportFormat === fmt
                  ? 'border-accent bg-accent/10 text-white'
                  : 'border-slate-600 text-slate-200 hover:border-slate-400 hover:text-white'
              )}
              onClick={() => onExportFormat(fmt)}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

