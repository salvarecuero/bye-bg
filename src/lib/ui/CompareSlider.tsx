import { useCallback, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

type Props = {
  beforeUrl?: string;
  afterUrl?: string;
  label?: string;
  processing?: boolean;
  outdated?: boolean;
  onRegenerate?: () => void;
};

// The split is driven by a CSS variable and transform-only wrappers so dragging
// never re-renders React or repaints the (often multi-megapixel) images.
const beforeClip = { transform: 'translateX(calc((var(--split) - 100) * 1%))' };
const beforeInner = {
  transform: 'translateX(calc((100 - var(--split)) * 1%))'
};
const afterClip = { transform: 'translateX(calc(var(--split) * 1%))' };
const afterInner = { transform: 'translateX(calc(var(--split) * -1%))' };
const splitOffset = { transform: 'translateX(calc(var(--split) * 1%))' };

export function CompareSlider({ beforeUrl, afterUrl, label, processing, outdated, onRegenerate }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const splitRef = useRef(50);
  const frameRef = useRef<number | null>(null);

  const setSplit = useCallback((value: number) => {
    splitRef.current = Math.min(100, Math.max(0, value));
    if (frameRef.current != null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      containerRef.current?.style.setProperty('--split', String(splitRef.current));
    });
  }, []);

  useEffect(
    () => () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSplit(((clientX - rect.left) / rect.width) * 100);
    },
    [setSplit]
  );

  const hasImage = !!(beforeUrl || afterUrl);
  const showOutdated = !!outdated && !!afterUrl && !processing;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-3xl glass checkerboard select-none touch-none"
      style={{ '--split': 50 } as React.CSSProperties}
    >
      {/* Before (original) — left of the split */}
      {beforeUrl && (
        <div className="absolute inset-0 z-0 overflow-hidden will-change-transform" style={beforeClip}>
          <img
            src={beforeUrl}
            className="absolute inset-0 h-full w-full object-contain will-change-transform"
            style={beforeInner}
            alt="Before"
            decoding="async"
            draggable={false}
          />
        </div>
      )}

      {/* After (processed) — right of the split */}
      {(afterUrl || (beforeUrl && processing)) && (
        <div className="absolute inset-0 z-10 overflow-hidden will-change-transform" style={afterClip}>
          <div className="absolute inset-0 will-change-transform" style={afterInner}>
            {afterUrl && (
              <img
                src={afterUrl}
                className={clsx(
                  'absolute inset-0 h-full w-full object-contain transition-opacity duration-300',
                  processing && 'opacity-40'
                )}
                alt="After"
                decoding="async"
                draggable={false}
              />
            )}
            {processing && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="loading-stripes absolute inset-y-0 -left-8 right-0" />
              </div>
            )}
          </div>
        </div>
      )}

      {!hasImage && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
          <div className="text-center px-4">
            <div className="text-sm">Load an image to begin</div>
            <div className="mt-1 text-xs text-slate-600">Single file for preview · multiple for batch</div>
          </div>
        </div>
      )}

      {hasImage && (
        <>
          <span className="absolute left-3 top-3 z-40 rounded-lg bg-black/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white/80 border border-white/10">
            Before
          </span>
          <span className="absolute right-3 top-3 z-40 rounded-lg bg-black/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white/80 border border-white/10">
            After
          </span>
        </>
      )}

      {/* Divider + handle ride the same transform as the split */}
      <div className="pointer-events-none absolute inset-0 z-20 will-change-transform" style={splitOffset}>
        <div className="absolute inset-y-0 left-0 w-[2px] -translate-x-px bg-white/50" />
        <button
          type="button"
          className="pointer-events-auto absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 slider-handle h-12 w-12 rounded-full border border-white/10 bg-slate-900/70 text-white flex items-center justify-center"
          onPointerDown={e => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            setFromClientX(e.clientX);
          }}
          onPointerMove={e => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromClientX(e.clientX);
          }}
          onKeyDown={e => {
            if (e.key === 'ArrowLeft') setSplit(splitRef.current - 5);
            if (e.key === 'ArrowRight') setSplit(splitRef.current + 5);
          }}
          aria-label="Drag to compare"
        >
          <div className="flex items-center gap-1 text-lg">
            <FiChevronLeft />
            <FiChevronRight />
          </div>
        </button>
      </div>

      {/* Outdated hint: overlaid so it never shifts layout */}
      <div
        className={clsx(
          'absolute inset-x-0 bottom-3 z-40 flex justify-center px-3 transition-all duration-200',
          showOutdated ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-1'
        )}
        aria-hidden={!showOutdated}
      >
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 py-1 pl-3 pr-1 text-[11px] text-slate-300 shadow-lg">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300/80" />
          <span>Made with previous settings</span>
          {onRegenerate && (
            <button
              type="button"
              tabIndex={showOutdated ? 0 : -1}
              onClick={onRegenerate}
              className="rounded-full px-2 py-0.5 font-medium text-sky-300 transition-colors hover:bg-sky-400/10 hover:text-sky-200"
            >
              Regenerate
            </button>
          )}
        </div>
      </div>

      {label && (
        <div className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs uppercase tracking-wider z-40">
          {label}
        </div>
      )}
    </div>
  );
}
