export type BatchItemStatus = 'pending' | 'processing' | 'completed' | 'error';

export type BatchItem = {
  id: string;
  file: File;
  originalName: string;
  thumbnailUrl: string;
  inputBytes: number[];
  status: BatchItemStatus;
  progress?: {
    pct?: number;
    message?: string;
  };
  result?: {
    outputUrl: string;
    outputBytes: Uint8Array;
    timingMs: number;
    width: number;
    height: number;
  };
  error?: string;
};

export type BatchState = {
  items: BatchItem[];
  isProcessing: boolean;
  currentIndex: number;
};
