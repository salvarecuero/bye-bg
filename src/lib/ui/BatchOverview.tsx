import { FiPlay, FiSquare, FiDownload, FiArchive } from 'react-icons/fi';
import { BatchProgressSummary } from './BatchProgressSummary';

type Props = {
  total: number;
  completed: number;
  errors: number;
  isProcessing: boolean;
  hasPending: boolean;
  onStartProcessing: () => void;
  onStopProcessing: () => void;
  onDownloadAll: () => void;
  onDownloadZip: () => void;
};

export function BatchOverview({
  total,
  completed,
  errors,
  isProcessing,
  hasPending,
  onStartProcessing,
  onStopProcessing,
  onDownloadAll,
  onDownloadZip,
}: Props) {
  const hasCompleted = completed > 0;

  return (
    <div className="h-full rounded-3xl bg-[#0d1426] p-6 glass flex flex-col items-center justify-center">
      {/* Large stats */}
      <div className="text-center mb-6">
        <div className="text-6xl font-bold text-accent mb-2">
          {completed}/{total}
        </div>
        <div className="text-slate-400">Images processed</div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md mb-6">
        <BatchProgressSummary
          total={total}
          completed={completed}
          errors={errors}
          isProcessing={isProcessing}
        />
      </div>

      {/* Processing controls */}
      <div className="flex items-center gap-3">
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
      </div>

      {/* Download section */}
      {hasCompleted && !isProcessing && (
        <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
          <div className="text-sm text-slate-400 mb-3">Download completed files</div>
          <div className="flex items-center gap-2 justify-center">
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
        </div>
      )}

      {/* Hint */}
      <div className="mt-8 text-xs text-slate-500">
        Select an image from the sidebar to preview before/after
      </div>
    </div>
  );
}
