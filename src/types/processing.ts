export type ProcessingPhase = 'idle' | 'download' | 'compute' | 'composite' | 'complete' | 'error';

export type PhaseStatus = 'pending' | 'active' | 'complete' | 'error';

export type ProcessingStats = {
  phase: ProcessingPhase;
  progress: number;
  message: string;
  modelName?: string;
  dimensions?: { width: number; height: number };
  timings?: {
    download?: number;
    inference?: number;
    composite?: number;
    total?: number;
  };
  error?: string;
};

export type PhaseInfo = {
  id: ProcessingPhase;
  label: string;
  status: PhaseStatus;
  time?: number;
  progress?: number;
};
