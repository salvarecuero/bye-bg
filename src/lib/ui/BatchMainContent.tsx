import { FiDownload, FiCheck, FiAlertTriangle, FiArchive, FiPlay, FiSquare } from 'react-icons/fi';
import clsx from 'clsx';
import { CompareSlider } from './CompareSlider';
import { BatchOverview } from './BatchOverview';
import type { BatchItem } from '../../types/batch';

type Props = {
  items: BatchItem[];
  selectedItem: BatchItem | null;
  isProcessing: boolean;
  completedCount: number;
  errorCount: number;
  exportFormat: 'png' | 'webp';
  onStartProcessing: () => void;
  onStopProcessing: () => void;
  onDownloadItem: (item: BatchItem) => void;
  onDownloadAll: () => void;
  onDownloadZip: () => void;
};

export function BatchMainContent({
  items,
  selectedItem,
  isProcessing,
  completedCount,
  errorCount,
  exportFormat,
  onStartProcessing,
  onStopProcessing,
  onDownloadItem,
  onDownloadAll,
  onDownloadZip,
}: Props) {
  const hasPending = items.some((i) => i.status === 'pending');

  // Show overview when no item is selected
  if (!selectedItem) {
    return (
      <BatchOverview
        total={items.length}
        completed={completedCount}
        errors={errorCount}
        isProcessing={isProcessing}
        hasPending={hasPending}
        onStartProcessing={onStartProcessing}
        onStopProcessing={onStopProcessing}
        onDownloadAll={onDownloadAll}
        onDownloadZip={onDownloadZip}
      />
    );
  }

  // Show comparison for selected item
  const isItemProcessing = selectedItem.status === 'processing';
  const isItemCompleted = selectedItem.status === 'completed';
  const isItemError = selectedItem.status === 'error';

  return (
    <div className="h-full rounded-3xl bg-[#0d1426] p-4 glass flex flex-col">
      {/* Header with item info */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white truncate" title={selectedItem.originalName}>
            {selectedItem.originalName}
          </div>
          <div className="text-xs text-slate-400">
            {isItemProcessing && 'Processing...'}
            {isItemCompleted &&
              selectedItem.result &&
              `${selectedItem.result.width} × ${selectedItem.result.height}`}
            {isItemError && 'Processing failed'}
            {selectedItem.status === 'pending' && 'Waiting to process'}
          </div>
        </div>

        {/* Status chip */}
        <div
          className={clsx(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border',
            isItemProcessing &&
              'bg-amber-500/15 border-amber-500/30 text-amber-400',
            isItemCompleted &&
              'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
            isItemError && 'bg-red-500/15 border-red-500/30 text-red-400',
            selectedItem.status === 'pending' &&
              'bg-slate-800/90 border-slate-700/50 text-slate-400'
          )}
        >
          {isItemCompleted && <FiCheck className="h-3 w-3" />}
          {isItemError && <FiAlertTriangle className="h-3 w-3" />}
          {isItemProcessing && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
          {selectedItem.status === 'pending' && (
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
          )}
          {selectedItem.status === 'pending' && 'Pending'}
          {isItemProcessing && 'Processing'}
          {isItemCompleted &&
            `${((selectedItem.result?.timingMs || 0) / 1000).toFixed(1)}s`}
          {isItemError && 'Error'}
        </div>
      </div>

      {/* Comparison slider - takes remaining space */}
      <div className="h-[250px] sm:h-[300px] xl:h-auto xl:flex-1 xl:min-h-0">
        <CompareSlider
          beforeUrl={selectedItem.thumbnailUrl}
          afterUrl={selectedItem.result?.outputUrl}
          processing={isItemProcessing}
        />
      </div>

      {/* Action buttons - centered */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {/* Start/Stop processing buttons */}
        {hasPending && !isProcessing && (
          <button
            onClick={onStartProcessing}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accentHover shadow-glow-sm hover:shadow-glow"
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

        {/* Single item download */}
        {isItemCompleted && (
          <button
            onClick={() => onDownloadItem(selectedItem)}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accentHover shadow-glow-sm hover:shadow-glow"
            title={`Download as ${exportFormat.toUpperCase()}`}
          >
            <FiDownload className="h-4 w-4" />
            Download
          </button>
        )}

        {/* Batch download buttons */}
        {completedCount > 0 && (
          <>
            <button
              onClick={onDownloadAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
              title="Download all completed files"
            >
              <FiDownload className="h-3.5 w-3.5" />
              All
            </button>
            <button
              onClick={onDownloadZip}
              className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
              title="Download all as ZIP"
            >
              <FiArchive className="h-3.5 w-3.5" />
              ZIP
            </button>
          </>
        )}
      </div>
    </div>
  );
}
