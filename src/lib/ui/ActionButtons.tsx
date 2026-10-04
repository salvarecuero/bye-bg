import { useState, useCallback } from 'react';
import clsx from 'clsx';
import { FiDownloadCloud, FiCopy, FiRefreshCw, FiRotateCw, FiCheck } from 'react-icons/fi';
import { ShortcutHint } from './ShortcutHint';
import { copyImageToClipboard, isClipboardSupported } from '../clipboard';
import { getShortcutLabel } from '../shortcuts/config';

type Props = {
  outputUrl?: string;
  /** Format of the existing result, which may differ from the current setting. */
  exportFormat: 'png' | 'webp';
  canReprocess: boolean;
  processing: boolean;
  settingsDirty?: boolean;
  hasError?: boolean;
  onDownload: () => void;
  onReprocess: () => void;
  onReset: () => void;
};

export function ActionButtons({
  outputUrl,
  exportFormat,
  canReprocess,
  processing,
  settingsDirty = false,
  hasError = false,
  onDownload,
  onReprocess,
  onReset
}: Props) {
  const [copySuccess, setCopySuccess] = useState(false);
  const clipboardSupported = isClipboardSupported();
  const canUseOutput = !!outputUrl && !processing;

  const handleCopy = useCallback(async () => {
    if (!outputUrl) return;

    try {
      const response = await fetch(outputUrl);
      const blob = await response.blob();
      const success = await copyImageToClipboard(blob);

      if (success) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [outputUrl]);

  if (!canReprocess && !outputUrl) {
    return (
      <div className="flex min-h-[44px] items-center text-xs text-slate-500">
        Drop an image to process it locally — nothing leaves this device.
      </div>
    );
  }

  const previousNote = "Uses the previous result — current settings aren't applied yet";

  return (
    <div className="flex min-h-[44px] items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <button
          onClick={onDownload}
          disabled={!canUseOutput}
          title={settingsDirty ? `${previousNote}` : `Download processed image as ${exportFormat.toUpperCase()}`}
          className={clsx(
            'relative flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-colors duration-200 btn-scale',
            canUseOutput
              ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:bg-emerald-400'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
          )}
        >
          <FiDownloadCloud className="h-5 w-5" />
          <span>Download {exportFormat.toUpperCase()}</span>
          <kbd className="ml-1 rounded bg-white/30 px-1.5 py-0.5 text-[11px] font-mono text-white border border-white/30">
            {getShortcutLabel('download')}
          </kbd>
          <span
            aria-hidden
            className={clsx(
              'absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0d1426] bg-amber-300 transition-opacity duration-200',
              settingsDirty && canUseOutput ? 'opacity-100' : 'opacity-0'
            )}
          />
        </button>

        {clipboardSupported && (
          <button
            onClick={handleCopy}
            disabled={!canUseOutput}
            title={settingsDirty ? previousNote : 'Copy image to clipboard'}
            className={clsx(
              'flex items-center justify-center rounded-xl p-2.5 transition-colors duration-200',
              canUseOutput
                ? 'border border-slate-500 text-slate-300 hover:border-slate-400 hover:text-white hover:bg-white/5'
                : 'border border-slate-700 text-slate-500 cursor-not-allowed',
              copySuccess && 'copy-success bg-emerald-500/20 border-emerald-500 text-emerald-400'
            )}
          >
            {copySuccess ? <FiCheck className="h-4 w-4" /> : <FiCopy className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div className="h-6 w-px bg-slate-700 mx-1" />

      <div className="flex items-center gap-2">
        {canReprocess && (
          <button
            onClick={onReprocess}
            disabled={processing}
            title="Process again with current settings"
            className={clsx(
              'flex min-w-[9.5rem] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors duration-200',
              processing
                ? 'border-slate-700 text-slate-500 cursor-not-allowed'
                : settingsDirty || hasError
                  ? 'border-sky-400/40 bg-sky-400/5 text-sky-200 hover:bg-sky-400/10'
                  : 'border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white'
            )}
          >
            <FiRefreshCw className={clsx('h-4 w-4', processing && 'animate-spin')} />
            <span>{hasError ? 'Retry' : 'Regenerate'}</span>
            <ShortcutHint shortcut={getShortcutLabel('reprocess')} />
          </button>
        )}

        <button
          onClick={onReset}
          disabled={processing}
          title="Clear image and reset"
          className={clsx(
            'flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors duration-200',
            processing ? 'text-slate-600 cursor-not-allowed' : 'text-red-400/80 hover:text-red-400 hover:bg-red-500/10'
          )}
        >
          <FiRotateCw className="h-4 w-4" />
          <span>Reset</span>
          <ShortcutHint shortcut="Esc" />
        </button>
      </div>
    </div>
  );
}
