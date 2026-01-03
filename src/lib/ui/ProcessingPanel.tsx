import { useState } from 'react';
import clsx from 'clsx';
import { FiDownloadCloud, FiCpu, FiLayers, FiCheck, FiAlertTriangle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import type { ProcessingStats, ProcessingPhase, PhaseStatus } from '../../types/processing';

type Props = {
  stats: ProcessingStats;
  backendLabel?: string;
};

type PhaseConfig = {
  id: ProcessingPhase;
  label: string;
  icon: React.ReactNode;
};

const phases: PhaseConfig[] = [
  { id: 'download', label: 'Download model', icon: <FiDownloadCloud className="h-3.5 w-3.5" /> },
  { id: 'compute', label: 'Process image', icon: <FiCpu className="h-3.5 w-3.5" /> },
  { id: 'composite', label: 'Composite', icon: <FiLayers className="h-3.5 w-3.5" /> }
];

function getPhaseStatus(phaseId: ProcessingPhase, currentPhase: ProcessingPhase, hasError: boolean): PhaseStatus {
  if (hasError && currentPhase === phaseId) return 'error';

  const phaseOrder: ProcessingPhase[] = ['idle', 'download', 'compute', 'composite', 'complete'];
  const currentIdx = phaseOrder.indexOf(currentPhase);
  const phaseIdx = phaseOrder.indexOf(phaseId);

  if (currentPhase === 'complete' || phaseIdx < currentIdx) return 'complete';
  if (phaseIdx === currentIdx) return 'active';
  return 'pending';
}

function PhaseRow({
  config,
  status,
  progress,
  time
}: {
  config: PhaseConfig;
  status: PhaseStatus;
  progress?: number;
  time?: number;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div
        className={clsx(
          'flex h-5 w-5 items-center justify-center rounded-full transition-colors',
          status === 'complete' && 'bg-emerald-500/20 text-emerald-400',
          status === 'active' && 'bg-accent/20 text-accent',
          status === 'pending' && 'bg-slate-700/50 text-slate-500',
          status === 'error' && 'bg-red-500/20 text-red-400'
        )}
      >
        {status === 'complete' ? (
          <FiCheck className="h-3 w-3" />
        ) : status === 'error' ? (
          <FiAlertTriangle className="h-3 w-3" />
        ) : status === 'active' ? (
          <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        ) : (
          <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />
        )}
      </div>

      <div className="flex flex-1 items-center gap-2">
        <span
          className={clsx(
            'text-sm transition-colors',
            status === 'active' && 'text-white font-medium',
            status === 'complete' && 'text-slate-300',
            status === 'pending' && 'text-slate-500',
            status === 'error' && 'text-red-400'
          )}
        >
          {config.label}
        </span>

        {status === 'active' && progress != null && (
          <div className="flex-1 max-w-[80px]">
            <div className="h-1 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="text-right">
        {status === 'active' && progress != null && (
          <span className="text-xs font-mono text-accent">{Math.round(progress)}%</span>
        )}
        {status === 'complete' && time != null && (
          <span className="text-xs font-mono text-slate-400">{(time / 1000).toFixed(1)}s</span>
        )}
      </div>
    </div>
  );
}

export function ProcessingPanel({ stats, backendLabel }: Props) {
  const [expanded, setExpanded] = useState(true);
  const isIdle = stats.phase === 'idle';
  const isComplete = stats.phase === 'complete';
  const isActive = !isIdle && !isComplete && stats.phase !== 'error';
  const hasError = stats.phase === 'error' || !!stats.error;

  return (
    <div
      className={clsx(
        'glass rounded-2xl border border-white/5 p-4 transition-shadow duration-300',
        isActive && 'progress-active'
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-sm"
      >
        <span className="font-semibold text-white">Processing</span>
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="text-xs font-mono text-accent">
              {stats.progress != null ? `${Math.round(stats.progress)}%` : '...'}
            </span>
          )}
          {expanded ? (
            <FiChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <FiChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Idle State - Ready to process */}
          {isIdle && (
            <div className="flex items-center gap-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                <FiCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm text-slate-200">Ready to process</div>
                <div className="text-xs text-slate-400">Drop or select an image to begin</div>
              </div>
            </div>
          )}

          {/* Phase Progress - Only show when processing or complete */}
          {!isIdle && (
            <div className="space-y-0.5">
              {phases.map(phase => {
                const status = getPhaseStatus(phase.id, stats.phase, hasError);
                const isCurrentPhase = phase.id === stats.phase;

                return (
                  <PhaseRow
                    key={phase.id}
                    config={phase}
                    status={status}
                    progress={isCurrentPhase ? stats.progress : undefined}
                    time={stats.timings?.[phase.id === 'download' ? 'download' : phase.id === 'compute' ? 'inference' : 'composite']}
                  />
                );
              })}
            </div>
          )}

          {/* Status Message */}
          {stats.message && (
            <div
              className={clsx(
                'text-xs',
                hasError ? 'text-red-400' : isActive ? 'text-slate-300' : 'text-slate-400'
              )}
            >
              {stats.message}
            </div>
          )}

          {/* Details Section (when complete or has data) */}
          {(isComplete || stats.dimensions || stats.timings?.total) && (
            <div className="border-t border-slate-700/50 pt-3 space-y-1">
              {backendLabel && stats.modelName && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Model</span>
                  <span className="text-slate-200 font-mono">{stats.modelName}</span>
                </div>
              )}
              {stats.dimensions && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Size</span>
                  <span className="text-slate-200 font-mono">
                    {stats.dimensions.width} x {stats.dimensions.height}
                  </span>
                </div>
              )}
              {stats.timings?.total != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total time</span>
                  <span className="text-emerald-400 font-mono font-semibold">
                    {(stats.timings.total / 1000).toFixed(2)}s
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {hasError && stats.error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">
              {stats.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
