import { useCallback, useMemo, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

type Props = {
  beforeUrl?: string;
  afterUrl?: string;
  label?: string;
};

export function CompareSlider({ beforeUrl, afterUrl, label }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [percent, setPercent] = useState(50);

  const gradient = useMemo(
    () =>
      'radial-gradient(circle at center, rgba(96,215,250,0.12), transparent)',
    []
  );

  const setFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const next = (x / rect.width) * 100;

    setPercent(Math.min(100, Math.max(0, next)));
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-3xl glass checkerboard select-none touch-none"
    >
      {beforeUrl && (
        <img
          src={beforeUrl}
          className="absolute inset-0 z-0 h-full w-full object-contain"
          style={{
            WebkitMaskImage: `linear-gradient(to right, transparent ${percent}%, black ${percent}%)`,
            maskImage: `linear-gradient(to right, transparent ${percent}%, black ${percent}%)`
          }}
          alt="Before"
          draggable={false}
        />
      )}

      {afterUrl && (
        <img
          src={afterUrl}
          className="absolute inset-0 z-10 h-full w-full object-contain"
          style={{
            WebkitMaskImage: `linear-gradient(to right, black ${percent}%, transparent ${percent}%)`,
            maskImage: `linear-gradient(to right, black ${percent}%, transparent ${percent}%)`
          }}
          alt="After"
          draggable={false}
        />
      )}

      {!beforeUrl && !afterUrl && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <div className="text-sm">Drop an image to begin</div>
          </div>
        </div>
      )}

      {/* Before/After labels */}
      {(beforeUrl || afterUrl) && (
        <>
          <span className="absolute left-3 top-3 z-40 rounded-lg bg-black/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white/80 border border-white/10 backdrop-blur-sm">
            Before
          </span>
          <span className="absolute right-3 top-3 z-40 rounded-lg bg-black/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white/80 border border-white/10 backdrop-blur-sm">
            After
          </span>
        </>
      )}

      <div
        className="absolute inset-0"
        style={{
          background: gradient,
          mixBlendMode: 'screen',
          opacity: 0.4
        }}
      />

      <div
        className="absolute top-0 bottom-0 z-20"
        style={{ left: `${percent}%`, transform: 'translateX(-1px)' }}
      >
        <div className="h-full w-[2px] bg-white/50" />
      </div>

      <button
        type="button"
        className="absolute z-30 top-1/2 -translate-y-1/2 -translate-x-1/2 slider-handle glass h-12 w-12 rounded-full border border-white/10 text-white flex items-center justify-center backdrop-blur-md"
        style={{ left: `${percent}%` }}
        onPointerDown={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
          setFromClientX(e.clientX);
          const onMove = (ev: PointerEvent) => setFromClientX(ev.clientX);
          const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
          };
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp, { once: true });
        }}
        aria-label="Drag to compare"
      >
        <div className="flex items-center gap-1 text-lg">
          <FiChevronLeft />
          <FiChevronRight />
        </div>
      </button>

      {label && (
        <div className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs uppercase tracking-wider z-40">
          {label}
        </div>
      )}
    </div>
  );
}

