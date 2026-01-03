import clsx from 'clsx';

type Props = {
  total: number;
  completed: number;
  errors: number;
  isProcessing: boolean;
};

export function BatchProgressSummary({ total, completed, errors, isProcessing }: Props) {
  const pending = total - completed - errors;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-slate-200 font-medium">
            {completed} of {total} processed
          </span>
          {errors > 0 && (
            <span className="text-red-400 text-xs">({errors} failed)</span>
          )}
        </div>
        {isProcessing && (
          <span className="text-xs text-accent font-mono">{Math.round(progress)}%</span>
        )}
      </div>

      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full flex">
          {/* Completed portion */}
          <div
            className={clsx(
              'h-full bg-emerald-500 transition-all duration-300',
              isProcessing && 'shadow-[0_0_8px_rgba(34,197,94,0.5)]'
            )}
            style={{ width: `${(completed / total) * 100}%` }}
          />
          {/* Error portion */}
          {errors > 0 && (
            <div
              className="h-full bg-red-500"
              style={{ width: `${(errors / total) * 100}%` }}
            />
          )}
          {/* Processing animation */}
          {isProcessing && pending > 0 && (
            <div
              className="h-full bg-accent/50 animate-pulse"
              style={{ width: `${(1 / total) * 100}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
