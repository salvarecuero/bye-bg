import clsx from 'clsx';
import { Fragment } from 'react';
import { Listbox, Switch } from '@headlessui/react';
import { FiAlertTriangle } from 'react-icons/fi';

type Quality = 'fast' | 'quality' | 'pro';
type ExportFormat = 'png' | 'webp';
type BackgroundMode = 'transparent' | 'color' | 'image';
type ModelStatus = 'loading' | 'ready' | 'error';

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
};

const qualities: { key: Quality; label: string }[] = [
  { key: 'fast', label: 'Fast' },
  { key: 'quality', label: 'Quality' },
  { key: 'pro', label: 'Pro' }
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
  capabilities
}: Props) {
  const getQualityWarning = (q: Quality): string | null => {
    if (q === capabilities.recommended) return null;
    if (q === 'pro' && !capabilities.fp16) return 'May be slow without FP16';
    if (q === 'fast' && capabilities.webgpu) return 'Lower quality than recommended';
    if (!capabilities.webgpu && q !== 'fast') return 'May be slow without WebGPU';
    return null;
  };
  return (
    <div className="glass w-full rounded-3xl border border-white/5 p-4 shadow-panel">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-300">Model</div>
          <div className="text-sm text-white font-semibold">{backendLabel}</div>
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

      <div className="mt-6">
        <div className="text-sm text-slate-300 mb-2">Quality</div>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-900/50 p-1">
          {qualities.map((q) => {
            const warning = getQualityWarning(q.key);
            const isRecommended = q.key === capabilities.recommended;
            return (
              <button
                key={q.key}
                className={clsx(
                  'relative rounded-lg py-2 text-sm font-semibold transition',
                  quality === q.key
                    ? 'bg-accent text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800'
                )}
                onClick={() => onQuality(q.key)}
                title={warning || (isRecommended ? 'Recommended for your browser' : '')}
              >
                <span className="flex items-center justify-center gap-1">
                  {q.label}
                  {warning && quality !== q.key && (
                    <FiAlertTriangle className="h-3 w-3 text-amber-400" />
                  )}
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
          <div className="text-sm text-white font-semibold">Refine edges</div>
          <div className="text-xs text-slate-400/80">
            Smooths hair/fine detail band
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

      <div className="mt-6 space-y-3">
        <div className="text-sm text-slate-300">Background</div>
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
                'rounded-xl border px-3 py-3 text-sm transition',
                bgMode === opt.key
                  ? 'border-accent bg-accent/10 text-white'
                  : 'border-slate-700 text-slate-300 hover:border-slate-500'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Listbox value={bgColor} onChange={onBgColor}>
          <div className="relative mt-1">
            <Listbox.Button className="w-full rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-left text-sm text-slate-200">
              <div className="flex items-center justify-between">
                <span>#{bgColor.replace('#', '').toUpperCase()}</span>
                <span
                  className="h-6 w-10 rounded border border-slate-600"
                  style={{ background: bgColor }}
                />
              </div>
            </Listbox.Button>
            <Listbox.Options className="absolute z-10 mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/90 p-2 text-sm shadow-panel">
              {['#0f172a', '#0ea5e9', '#1e293b', '#f8fafc', '#ec4899'].map(
                (color) => (
                  <Listbox.Option key={color} value={color} as={Fragment}>
                    {({ active, selected }) => (
                      <button
                        className={clsx(
                          'flex w-full items-center justify-between rounded-lg px-3 py-2',
                          active ? 'bg-slate-800' : '',
                          selected ? 'text-accent' : 'text-slate-200'
                        )}
                      >
                        <span>{color}</span>
                        <span
                          className="h-6 w-10 rounded border border-slate-600"
                          style={{ background: color }}
                        />
                      </button>
                    )}
                  </Listbox.Option>
                )
              )}
            </Listbox.Options>
          </div>
        </Listbox>

        <button
          onClick={onBgImageUpload}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 transition hover:border-accent"
        >
          Upload background image
        </button>
      </div>

      <div className="mt-6">
        <div className="text-sm text-slate-300 mb-2">Export</div>
        <div className="flex gap-3">
          {(['png', 'webp'] as ExportFormat[]).map((fmt) => (
            <button
              key={fmt}
              className={clsx(
                'flex-1 rounded-xl border px-3 py-3 text-sm font-semibold transition',
                exportFormat === fmt
                  ? 'border-accent bg-accent/10 text-white'
                  : 'border-slate-700 text-slate-300 hover:border-slate-500'
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

