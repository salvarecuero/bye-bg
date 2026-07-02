export type BatchItemStatus = "pending" | "processing" | "completed" | "error";

export type BatchItem = {
  id: string;
  file: File;
  originalName: string;
  thumbnailUrl: string;
  inputBytes: ArrayBuffer;
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
