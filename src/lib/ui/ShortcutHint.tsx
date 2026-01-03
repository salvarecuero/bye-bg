import clsx from 'clsx';

type Props = {
  shortcut: string;
  className?: string;
  variant?: 'default' | 'light';
};

export function ShortcutHint({ shortcut, className, variant = 'default' }: Props) {
  return (
    <kbd
      className={clsx(
        'ml-2 rounded px-1.5 py-0.5 text-xs font-mono',
        'border transition-colors',
        variant === 'light'
          ? 'bg-slate-800/80 text-slate-300 border-slate-600'
          : 'bg-slate-700/60 text-slate-300 border-slate-500/50',
        'sm:inline-block hidden',
        className
      )}
    >
      {shortcut}
    </kbd>
  );
}
