import clsx from 'clsx';
import { FiX, FiCheck, FiAlertTriangle, FiDownload } from 'react-icons/fi';
import type { BatchItem } from '../../types/batch';

type Props = {
  item: BatchItem;
  isCurrent: boolean;
  exportFormat: 'png' | 'webp';
  onRemove: () => void;
  onDownload: () => void;
};

export function BatchQueueItem({ item, isCurrent, exportFormat, onRemove, onDownload }: Props) {
  const isPending = item.status === 'pending';
  const isProcessing = item.status === 'processing';
  const isCompleted = item.status === 'completed';
  const isError = item.status === 'error';

  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 batch-item-enter',
        isProcessing && 'border-accent bg-accent/5 shadow-glow-sm',
        isCompleted && 'border-emerald-500/30 bg-emerald-500/5',
        isError && 'border-red-500/30 bg-red-500/5',
        isPending && 'border-slate-700 bg-slate-800/30'
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-800">
        <img
          src={item.result?.outputUrl || item.thumbnailUrl}
          alt={item.originalName}
          className="h-full w-full object-cover"
        />
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium text-slate-200">{item.originalName}</div>
        <div className="text-xs text-slate-400">
          {isPending && 'Waiting...'}
          {isProcessing && (
            <span className="text-accent">
              {item.progress?.message || 'Processing...'}
              {item.progress?.pct != null && ` ${Math.round(item.progress.pct)}%`}
            </span>
          )}
          {isCompleted && (
            <span className="text-emerald-400">
              Completed in {((item.result?.timingMs || 0) / 1000).toFixed(1)}s
            </span>
          )}
          {isError && <span className="text-red-400">{item.error || 'Error'}</span>}
        </div>

        {/* Progress bar for processing state */}
        {isProcessing && item.progress?.pct != null && (
          <div className="mt-1.5 h-1 w-full rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${Math.min(100, item.progress.pct)}%` }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {isCompleted && (
          <button
            onClick={onDownload}
            className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title={`Download as ${exportFormat.toUpperCase()}`}
          >
            <FiDownload className="h-4 w-4" />
          </button>
        )}

        {isCompleted && (
          <div className="rounded-full bg-emerald-500/20 p-1">
            <FiCheck className="h-3 w-3 text-emerald-400" />
          </div>
        )}

        {isError && (
          <div className="rounded-full bg-red-500/20 p-1">
            <FiAlertTriangle className="h-3 w-3 text-red-400" />
          </div>
        )}

        {!isProcessing && (
          <button
            onClick={onRemove}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
            title="Remove from queue"
          >
            <FiX className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
