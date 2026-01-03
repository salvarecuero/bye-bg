import { useState, useCallback } from 'react';
import clsx from 'clsx';
import { FiDownloadCloud, FiCopy, FiRefreshCw, FiRotateCw, FiCheck } from 'react-icons/fi';
import { ShortcutHint } from './ShortcutHint';
import { copyImageToClipboard, isClipboardSupported } from '../clipboard';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl';

type Props = {
  outputUrl?: string;
  exportFormat: 'png' | 'webp';
  canReprocess: boolean;
  processing: boolean;
  onDownload: () => void;
  onReprocess: () => void;
  onReset: () => void;
};

export function ActionButtons({
  outputUrl,
  exportFormat,
  canReprocess,
  processing,
  onDownload,
  onReprocess,
  onReset
}: Props) {
  const [copySuccess, setCopySuccess] = useState(false);
  const clipboardSupported = isClipboardSupported();

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

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Primary Group */}
      <div className="flex items-center gap-2">
        {/* Download Button - Primary */}
        <button
          onClick={onDownload}
          disabled={!outputUrl || processing}
          title={`Download processed image as ${exportFormat.toUpperCase()}`}
          className={clsx(
            'flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all duration-200 btn-scale',
            outputUrl && !processing
              ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
          )}
        >
          <FiDownloadCloud className="h-5 w-5" />
          <span>Download {exportFormat.toUpperCase()}</span>
          <kbd className="ml-1 rounded bg-white/30 px-1.5 py-0.5 text-[11px] font-mono text-white border border-white/30">
            {modKey}S
          </kbd>
        </button>

        {/* Copy Button - Secondary icon */}
        {clipboardSupported && (
          <button
            onClick={handleCopy}
            disabled={!outputUrl || processing}
            title="Copy image to clipboard"
            className={clsx(
              'flex items-center justify-center rounded-xl p-2.5 transition-all duration-200',
              outputUrl && !processing
                ? 'border border-slate-500 text-slate-300 hover:border-slate-400 hover:text-white hover:bg-white/5'
                : 'border border-slate-700 text-slate-500 cursor-not-allowed',
              copySuccess && 'copy-success bg-emerald-500/20 border-emerald-500 text-emerald-400'
            )}
          >
            {copySuccess ? (
              <FiCheck className="h-4 w-4" />
            ) : (
              <FiCopy className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Divider */}
      {canReprocess && <div className="h-6 w-px bg-slate-700 mx-1" />}

      {/* Secondary Group */}
      <div className="flex items-center gap-2">
        {/* Reprocess Button - Tertiary */}
        {canReprocess && (
          <button
            onClick={onReprocess}
            disabled={processing}
            title="Reprocess with current settings"
            className={clsx(
              'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-200',
              processing
                ? 'border-slate-700 text-slate-500 cursor-not-allowed'
                : 'border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white'
            )}
          >
            <FiRefreshCw className={clsx('h-4 w-4', processing && 'animate-spin')} />
            <span>Reprocess</span>
          </button>
        )}

        {/* Reset Button - Ghost */}
        <button
          onClick={onReset}
          disabled={processing}
          title="Clear image and reset"
          className={clsx(
            'flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-200',
            processing
              ? 'text-slate-600 cursor-not-allowed'
              : 'text-red-400/80 hover:text-red-400 hover:bg-red-500/10'
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
