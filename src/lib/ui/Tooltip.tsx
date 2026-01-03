import { useState } from 'react';
import clsx from 'clsx';
import { FiInfo } from 'react-icons/fi';

type Props = {
  content: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  iconClassName?: string;
};

export function Tooltip({ content, children, showIcon = true, iconClassName }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      {children}
      <button
        type="button"
        className={clsx(
          'inline-flex items-center justify-center rounded-full p-0.5 transition-colors',
          'text-slate-500 hover:text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent/50',
          showIcon && 'ml-1.5',
          iconClassName
        )}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-label="More information"
      >
        {showIcon && <FiInfo className="h-3.5 w-3.5" />}
      </button>

      {isVisible && (
        <div
          className={clsx(
            'absolute z-50 w-56 px-3 py-2 text-xs text-slate-200 rounded-lg',
            'bg-slate-800 border border-slate-700 shadow-lg',
            'left-full ml-2 top-1/2 -translate-y-1/2',
            'animate-in fade-in-0 zoom-in-95 duration-150'
          )}
          role="tooltip"
        >
          {content}
          {/* Arrow */}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 rotate-45 w-2 h-2 bg-slate-800 border-l border-b border-slate-700" />
        </div>
      )}
    </div>
  );
}

// Simple inline tooltip that wraps content with a title attribute
export function TooltipSimple({ content, children }: { content: string; children: React.ReactNode }) {
  return (
    <span title={content} className="cursor-help">
      {children}
    </span>
  );
}
