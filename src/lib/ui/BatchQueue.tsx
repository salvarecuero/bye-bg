import clsx from 'clsx';
import { FiPlay, FiSquare, FiTrash2, FiDownload, FiArchive } from 'react-icons/fi';
import { BatchQueueItem } from './BatchQueueItem';
import { BatchProgressSummary } from './BatchProgressSummary';
import { Dropzone } from './Dropzone';
import type { BatchItem } from '../../types/batch';

type Props = {
  items: BatchItem[];
  isProcessing: boolean;
  currentIndex: number;
  completedCount: number;
  errorCount: number;
  exportFormat: 'png' | 'webp';
  onAddFiles: (files: File[]) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onStartProcessing: () => void;
  onStopProcessing: () => void;
  onDownloadItem: (item: BatchItem) => void;
  onDownloadAll: () => void;
  onDownloadZip: () => void;
};

export function BatchQueue({
  items,
  isProcessing,
  currentIndex,
  completedCount,
  errorCount,
  exportFormat,
  onAddFiles,
  onRemoveItem,
  onClearAll,
  onStartProcessing,
  onStopProcessing,
  onDownloadItem,
  onDownloadAll,
  onDownloadZip
}: Props) {
  const hasItems = items.length > 0;
  const hasPending = items.some(i => i.status === 'pending');
  const hasCompleted = completedCount > 0;

  return (
    <div className="space-y-4">
      {/* Dropzone for adding more files */}
      <Dropzone
        onFiles={onAddFiles}
        multiple
        disabled={isProcessing}
        compact={hasItems}
      />

      {hasItems && (
        <>
          {/* Progress Summary */}
          <BatchProgressSummary
            total={items.length}
            completed={completedCount}
            errors={errorCount}
            isProcessing={isProcessing}
          />

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Start/Stop Processing */}
              {hasPending && !isProcessing && (
                <button
                  onClick={onStartProcessing}
                  className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-accentHover shadow-glow-sm hover:shadow-glow"
                >
                  <FiPlay className="h-4 w-4" />
                  Start Processing
                </button>
              )}
              {isProcessing && (
                <button
                  onClick={onStopProcessing}
                  className="flex items-center gap-2 rounded-xl border border-amber-500/50 px-4 py-2 text-sm font-semibold text-amber-400 transition hover:bg-amber-500/10"
                >
                  <FiSquare className="h-4 w-4" />
                  Stop
                </button>
              )}

              {/* Clear All */}
              {!isProcessing && (
                <button
                  onClick={onClearAll}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:text-slate-200 hover:bg-slate-800/50"
                >
                  <FiTrash2 className="h-4 w-4" />
                  Clear All
                </button>
              )}
            </div>

            {/* Download Actions */}
            {hasCompleted && !isProcessing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onDownloadAll}
                  className="flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
                  title="Download all completed files separately"
                >
                  <FiDownload className="h-4 w-4" />
                  Download All
                </button>
                <button
                  onClick={onDownloadZip}
                  className="flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
                  title="Download all as ZIP archive"
                >
                  <FiArchive className="h-4 w-4" />
                  ZIP
                </button>
              </div>
            )}
          </div>

          {/* Queue Items */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {items.map((item, index) => (
              <BatchQueueItem
                key={item.id}
                item={item}
                isCurrent={index === currentIndex}
                exportFormat={exportFormat}
                onRemove={() => onRemoveItem(item.id)}
                onDownload={() => onDownloadItem(item)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
