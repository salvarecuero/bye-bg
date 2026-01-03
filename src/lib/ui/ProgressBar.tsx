import clsx from 'clsx';

type Props = {
  label: string;
  progress?: number;
  message?: string;
};

export function ProgressBar({ label, progress, message }: Props) {
  const isActive = progress != null && progress > 0 && progress < 100;

  return (
    <div className={clsx(
      'glass rounded-2xl border border-white/5 p-4 transition-shadow duration-300',
      isActive && 'progress-active'
    )}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-white">{label}</span>
        <span className={clsx(
          'font-mono',
          isActive ? 'text-accent' : 'text-slate-400'
        )}>
          {progress != null ? `${Math.round(progress)}%` : '--'}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full bg-accent transition-all duration-300',
            isActive && 'shadow-[0_0_10px_rgba(14,165,233,0.5)]'
          )}
          style={{ width: `${Math.max(0, Math.min(progress ?? 0, 100))}%` }}
        />
      </div>
      {message && (
        <div className={clsx(
          'mt-2 text-xs',
          isActive ? 'text-slate-300' : 'text-slate-400'
        )}>
          {message}
        </div>
      )}
    </div>
  );
}

