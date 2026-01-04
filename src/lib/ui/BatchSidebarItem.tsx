import clsx from 'clsx';
import { FiX, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import type { BatchItem } from '../../types/batch';

type Props = {
  item: BatchItem;
  isSelected: boolean;
  onClick: () => void;
  onRemove: () => void;
};

export function BatchSidebarItem({ item, isSelected, onClick, onRemove }: Props) {
  const isProcessing = item.status === 'processing';
  const isCompleted = item.status === 'completed';
  const isError = item.status === 'error';

  return (
    <button
      onClick={onClick}
      className={clsx(
        'group flex items-center gap-2 rounded-xl p-1.5 xl:p-2 transition-all duration-150 text-left',
        'w-auto shrink-0 xl:w-full',
        isSelected && 'ring-2 ring-accent bg-accent/10',
        !isSelected && 'hover:bg-slate-800/50'
      )}
    >
      {/* Thumbnail - larger on mobile for touch, normal on desktop */}
      <div className="relative h-12 w-12 xl:h-10 xl:w-10 shrink-0 overflow-hidden rounded-lg bg-slate-800">
        <img
          src={item.result?.outputUrl || item.thumbnailUrl}
          alt={item.originalName}
          className="h-full w-full object-cover"
        />
        {/* Status overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}
        {/* Mobile: Status badge overlay */}
        <div className="xl:hidden absolute -bottom-0.5 -right-0.5">
          {isCompleted && (
            <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <FiCheck className="h-2.5 w-2.5 text-white" />
            </div>
          )}
          {isError && (
            <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
              <FiAlertTriangle className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Name + status - hidden on mobile, shown on desktop */}
      <div className="hidden xl:block flex-1 min-w-0 pr-1">
        <div className="truncate text-sm text-slate-200">{item.originalName}</div>
        <div className="flex items-center gap-1.5 text-xs">
          {item.status === 'pending' && (
            <span className="text-slate-500">Pending</span>
          )}
          {isProcessing && (
            <span className="text-accent">
              {item.progress?.pct != null
                ? `${Math.round(item.progress.pct)}%`
                : 'Processing...'}
            </span>
          )}
          {isCompleted && (
            <>
              <FiCheck className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">
                {((item.result?.timingMs || 0) / 1000).toFixed(1)}s
              </span>
            </>
          )}
          {isError && (
            <>
              <FiAlertTriangle className="h-3 w-3 text-red-400" />
              <span className="text-red-400">Error</span>
            </>
          )}
        </div>
        {/* Progress bar for processing state */}
        {isProcessing && item.progress?.pct != null && (
          <div className="mt-1 h-0.5 w-full rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${Math.min(100, item.progress.pct)}%` }}
            />
          </div>
        )}
      </div>

      {/* Remove button - desktop only, visible on hover */}
      {!isProcessing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hidden xl:block shrink-0 rounded-lg p-1.5 text-slate-500 opacity-0 group-hover:opacity-100 hover:text-slate-200 hover:bg-slate-700/50 transition-all"
          title="Remove from queue"
        >
          <FiX className="h-3.5 w-3.5" />
        </button>
      )}
    </button>
  );
}
