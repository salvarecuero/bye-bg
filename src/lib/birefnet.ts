type OrtTensor = {
  data: Float32Array | Uint16Array | number[];
  dims: readonly number[];
  dispose: () => void;
};

type OrtSession = {
  inputNames: string[];
  run: (feeds: Record<string, OrtTensor>) => Promise<Record<string, OrtTensor>>;
};

type OrtApi = {
  Tensor: new (
    type: "float32",
    data: Float32Array,
    dims: number[],
  ) => OrtTensor;
  InferenceSession: {
    create: (
      model: Uint8Array,
      options?: {
        executionProviders?: string[];
        graphOptimizationLevel?: string;
      },
    ) => Promise<OrtSession>;
  };
  env: {
    wasm: {
      numThreads: number;
      proxy: boolean;
      wasmPaths?: { wasm: string; mjs: string } | string;
    };
  };
};

export type BirefnetProgress = {
  phase: string;
  message: string;
  loaded?: number;
  total?: number;
};

const INPUT_SIZE = 512;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const MODEL_BYTES = 98_484_532;
const CACHE_NAME = "bye-bg-birefnet-lite-512-fp16-v1";
const MODEL_URL =
  (import.meta.env.VITE_BIREFNET_MODEL_URL as string | undefined) ??
  "https://huggingface.co/studioludens/birefnet-lite-512/resolve/4a3c40c36c94093cc1e724d9ea428b8fa4b57dc7/onnx/model_fp16.onnx";

let ort: OrtApi | null = null;
let session: OrtSession | null = null;
let disabled = false;
let initializing: Promise<OrtSession> | null = null;

export function isBirefnetDisabled(): boolean {
  return disabled;
}

export function markBirefnetDisabled(): void {
  disabled = true;
}

type GpuNavigator = {
  gpu?: {
    requestAdapter: (options?: {
      powerPreference?: "high-performance" | "low-power";
    }) => Promise<unknown>;
  };
};

export async function hasWebGPU(): Promise<boolean> {
  const gpu = (self as unknown as { navigator?: GpuNavigator }).navigator?.gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter({
      powerPreference: "high-performance",
    });
    return adapter != null;
  } catch {
    return false;
  }
}

export async function removeBackgroundBirefnet(
  image: Blob,
  onProgress: (info: BirefnetProgress) => void,
): Promise<Blob> {
  const bitmap = await createImageBitmap(image);
  try {
    const activeSession = await getSession(onProgress);
    onProgress({
      phase: "compute:inference",
      message: "Processing image…",
    });

    const input = imageToTensor(bitmap);
    const inputName = resolveInputName(activeSession);
    const feeds: Record<string, OrtTensor> = {
      [inputName]: new ort!.Tensor("float32", input, [
        1,
        3,
        INPUT_SIZE,
        INPUT_SIZE,
      ]),
    };

    const results = await activeSession.run(feeds);
    feeds[inputName].dispose();

    const output = pickOutput(results);
    const logits = tensorToFloat32(output);
    Object.values(results).forEach((value) => value.dispose());

    return await matteToForegroundBlob(bitmap, logits);
  } finally {
    bitmap.close();
  }
}

async function getSession(
  onProgress: (info: BirefnetProgress) => void,
): Promise<OrtSession> {
  if (session) return session;
  if (initializing) return initializing;

  initializing = (async () => {
    const model = await loadModelBuffer(onProgress);
    onProgress({
      phase: "download",
      message: "Initializing model…",
      loaded: 1,
      total: 1,
    });

    const ortModule = (await import("onnxruntime-web/webgpu")) as {
      default?: OrtApi;
    } & OrtApi;
    ort = ortModule.default ?? ortModule;

    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;

    session = await ort.InferenceSession.create(model, {
      executionProviders: ["webgpu"],
      graphOptimizationLevel: "all",
    });
    return session;
  })();

  try {
    return await initializing;
  } catch (err) {
    initializing = null;
    session = null;
    throw err;
  }
}

async function loadModelBuffer(
  onProgress: (info: BirefnetProgress) => void,
): Promise<Uint8Array> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(MODEL_URL);
    if (hit) {
      onProgress({
        phase: "download",
        message: "Loading cached model…",
        loaded: 1,
        total: 1,
      });
      return new Uint8Array(await hit.arrayBuffer());
    }
  } catch {
    // Cache is optional (private mode, missing Cache API, etc).
  }

  onProgress({
    phase: "download",
    message: "Downloading model 0%",
    loaded: 0,
    total: MODEL_BYTES,
  });

  const response = await fetch(MODEL_URL);
  if (!response.ok) {
    throw new Error(`Failed to download BiRefNet model (${response.status})`);
  }

  const total = Number(response.headers.get("content-length")) || MODEL_BYTES;
  const buffer = await readBody(response, total, onProgress);

  try {
    const cache = await caches.open(CACHE_NAME);
    const bytes = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
    await cache.put(
      MODEL_URL,
      new Response(bytes, {
        headers: { "Content-Type": "application/octet-stream" },
      }),
    );
  } catch {
    // Ignore cache write failures.
  }

  return buffer;
}

async function readBody(
  response: Response,
  total: number,
  onProgress: (info: BirefnetProgress) => void,
): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) {
    return new Uint8Array(await response.arrayBuffer());
  }

  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress({
      phase: "download",
      message: `Downloading model ${Math.round((received / total) * 100)}%`,
      loaded: received,
      total,
    });
  }

  const out = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function imageToTensor(bitmap: ImageBitmap): Float32Array {
  const canvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(bitmap, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);

  const plane = INPUT_SIZE * INPUT_SIZE;
  const tensor = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const p = i * 4;
    tensor[i] = (data[p] / 255 - MEAN[0]) / STD[0];
    tensor[plane + i] = (data[p + 1] / 255 - MEAN[1]) / STD[1];
    tensor[plane * 2 + i] = (data[p + 2] / 255 - MEAN[2]) / STD[2];
  }
  return tensor;
}

function resolveInputName(activeSession: OrtSession): string {
  return activeSession.inputNames.includes("input_image")
    ? "input_image"
    : activeSession.inputNames[0];
}

function pickOutput(results: Record<string, OrtTensor>): OrtTensor {
  if (results.logits) return results.logits;
  const names = Object.keys(results);
  return results[names[names.length - 1]];
}

function tensorToFloat32(tensor: OrtTensor): Float32Array {
  const data = tensor.data;
  if (data instanceof Float32Array) return data;
  if (data instanceof Uint16Array) {
    const out = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = fp16ToFloat32(data[i]);
    return out;
  }
  return Float32Array.from(data as ArrayLike<number>);
}

function fp16ToFloat32(h: number): number {
  const s = (h & 0x8000) >> 15;
  const e = (h & 0x7c00) >> 10;
  const f = h & 0x03ff;
  if (e === 0) return (s ? -1 : 1) * 2 ** -14 * (f / 1024);
  if (e === 0x1f) return f ? NaN : s ? -Infinity : Infinity;
  return (s ? -1 : 1) * 2 ** (e - 15) * (1 + f / 1024);
}

function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

async function matteToForegroundBlob(
  bitmap: ImageBitmap,
  logits: Float32Array,
): Promise<Blob> {
  const spatial = INPUT_SIZE * INPUT_SIZE;
  const values =
    logits.length === spatial
      ? logits
      : logits.subarray(logits.length - spatial);

  const mask = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
  const maskCtx = mask.getContext("2d");
  if (!maskCtx) throw new Error("2d context unavailable");
  const maskData = maskCtx.createImageData(INPUT_SIZE, INPUT_SIZE);
  for (let i = 0; i < spatial; i++) {
    const p = i * 4;
    const alpha = Math.round(sigmoid(values[i]) * 255);
    maskData.data[p] = 255;
    maskData.data[p + 1] = 255;
    maskData.data[p + 2] = 255;
    maskData.data[p + 3] = alpha;
  }
  maskCtx.putImageData(maskData, 0, 0);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(bitmap, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(mask, 0, 0, bitmap.width, bitmap.height);

  const blob = await canvas.convertToBlob({ type: "image/png" });
  if (!blob) throw new Error("Failed to encode BiRefNet cutout");
  return blob;
}
