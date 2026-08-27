import { removeBackground } from "@imgly/background-removal";
import {
  hasWebGPU,
  isBirefnetDisabled,
  markBirefnetDisabled,
  removeBackgroundBirefnet,
} from "../lib/birefnet";
import { refineAlphaEdges } from "../lib/image";
import {
  BALANCED_MODEL_ID,
  BIREFNET_MODEL_ID,
  imglyModelForTier,
  type ImglyModel,
  type QualityTier,
} from "../lib/models";

const isDownloadPhase = (phase: string) => phase.startsWith("fetch:");
const isComputePhase = (phase: string) => phase.startsWith("compute:");
const imglyPublicPath = import.meta.env.VITE_IMGLY_PUBLIC_PATH as
  | string
  | undefined;

type DevicePreference = "auto" | "gpu" | "cpu";

type InitMessage = {
  id: string;
  type: "init";
  payload: {
    tier: QualityTier;
    preferFp16: boolean;
    refineEdgesDefault: boolean;
  };
};

type ProcessMessage = {
  id: string;
  type: "process";
  payload: {
    image: { kind: "blob"; mime: string; bytes: ArrayBuffer };
    options: {
      tier: QualityTier;
      refineEdges: boolean;
      bgMode: "transparent" | "color" | "image";
      bgColor: string;
      bgImageBytes?: ArrayBuffer;
      exportFormat: "png" | "webp";
      device?: DevicePreference;
    };
  };
};

type DisposeMessage = { id: string; type: "dispose" };

type Message = InitMessage | ProcessMessage | DisposeMessage;

type ProgressPayload = {
  phase: string;
  message: string;
  loaded?: number;
  total?: number;
  modelName?: string;
  timings?: { download?: number; inference?: number; composite?: number };
};

self.onmessage = async (event: MessageEvent<Message>) => {
  const { id, type } = event.data;
  if (type === "init") {
    postMessage({
      id,
      type: "progress",
      payload: { phase: "init", message: "Worker ready" },
    });
    return;
  }

  if (type === "dispose") {
    postMessage({
      id,
      type: "progress",
      payload: { phase: "dispose", message: "Disposed" },
    });
    return;
  }

  if (type !== "process") return;

  const t0 = performance.now();
  const processId = id;

  const timings: { download?: number; inference?: number; composite?: number } =
    {};
  let phaseStart = t0;
  let currentPhase = "";

  const postProgress = (payload: ProgressPayload) => {
    postMessage({
      id: processId,
      type: "progress",
      payload: { ...payload, timings: { ...timings } },
    });
  };

  const trackPhase = (phase: string) => {
    const wasDownload =
      isDownloadPhase(currentPhase) || currentPhase === "download";
    const wasCompute =
      isComputePhase(currentPhase) || currentPhase === "compute";
    const isDownload = isDownloadPhase(phase) || phase === "download";
    const isCompute = isComputePhase(phase) || phase === "compute";
    const phaseTypeChanged =
      currentPhase !== "" &&
      (wasDownload !== isDownload || wasCompute !== isCompute);

    if (phaseTypeChanged) {
      const now = performance.now();
      if (wasDownload) {
        timings.download = Math.round(now - phaseStart);
      } else if (wasCompute) {
        timings.inference = Math.round(now - phaseStart);
      }
      phaseStart = now;
    }
    currentPhase = phase;
  };

  try {
    const bytes = new Uint8Array(event.data.payload.image.bytes);
    const blob = new Blob([bytes], { type: event.data.payload.image.mime });

    const tier = event.data.payload.options.tier;
    const device = event.data.payload.options.device || "auto";
    const webgpu = await hasWebGPU();
    const imglyDevice = resolveImglyDevice(device, webgpu);

    let modelName =
      tier === "pro" ? BIREFNET_MODEL_ID : imglyModelForTier(tier);
    const canAttemptBirefnet =
      tier === "pro" && device !== "cpu" && webgpu && !isBirefnetDisabled();

    postProgress({
      phase: "download",
      message: canAttemptBirefnet
        ? "Preparing…"
        : tier === "pro"
          ? "Pro unavailable — using Balanced…"
          : "Preparing…",
      modelName: canAttemptBirefnet
        ? BIREFNET_MODEL_ID
        : imglyModelForTier(tier),
    });

    let resultBlob: Blob;
    if (canAttemptBirefnet) {
      try {
        resultBlob = await removeBackgroundBirefnet(blob, (info) => {
          trackPhase(info.phase);
          postProgress({
            ...info,
            modelName: BIREFNET_MODEL_ID,
          });
        });
        modelName = BIREFNET_MODEL_ID;
      } catch (err) {
        if (!isDownloadFailure(err)) {
          markBirefnetDisabled();
        }
        modelName = BALANCED_MODEL_ID;
        postProgress({
          phase: "download",
          message: `Pro failed — falling back to Balanced (${errorMessage(err)})`,
          modelName,
        });
        resultBlob = await runImgly(
          blob,
          BALANCED_MODEL_ID,
          imglyDevice === "cpu" ? "gpu" : imglyDevice,
          (info) => {
            trackPhase(info.phase);
            postProgress({ ...info, modelName });
          },
        );
      }
    } else {
      const imglyModel = imglyModelForTier(tier);
      modelName = imglyModel;
      resultBlob = await runImgly(blob, imglyModel, imglyDevice, (info) => {
        trackPhase(info.phase);
        postProgress({ ...info, modelName });
      });
    }

    if (isComputePhase(currentPhase) || currentPhase === "compute") {
      timings.inference = Math.round(performance.now() - phaseStart);
      phaseStart = performance.now();
    } else if (isDownloadPhase(currentPhase) || currentPhase === "download") {
      timings.download = Math.round(performance.now() - phaseStart);
      phaseStart = performance.now();
    }

    postProgress({
      phase: "composite",
      message: "Compositing…",
      modelName,
    });

    const bitmap = await createImageBitmap(resultBlob);
    let foreground: ImageBitmap | OffscreenCanvas = bitmap;

    if (event.data.payload.options.refineEdges) {
      const refineCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const refineCtx = refineCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      if (!refineCtx) throw new Error("2d context unavailable");
      refineCtx.drawImage(bitmap, 0, 0);
      const imageData = refineCtx.getImageData(
        0,
        0,
        refineCanvas.width,
        refineCanvas.height,
      );
      refineCtx.putImageData(refineAlphaEdges(imageData), 0, 0);
      foreground = refineCanvas;
    }

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");

    if (event.data.payload.options.bgMode === "color") {
      ctx.fillStyle = event.data.payload.options.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (event.data.payload.options.bgMode === "image") {
      const bgBytes = event.data.payload.options.bgImageBytes;
      if (bgBytes) {
        const bgBlob = new Blob([new Uint8Array(bgBytes)]);
        const bgBitmap = await createImageBitmap(bgBlob);
        ctx.drawImage(bgBitmap, 0, 0, canvas.width, canvas.height);
      }
    }

    ctx.drawImage(foreground, 0, 0);

    const exportMime =
      event.data.payload.options.exportFormat === "webp"
        ? "image/webp"
        : "image/png";
    const exportBlob = await canvas.convertToBlob({ type: exportMime });
    const processed = await exportBlob.arrayBuffer();

    timings.composite = Math.round(performance.now() - phaseStart);
    const totalMs = Math.round(performance.now() - t0);

    const resultMessage = {
      id: processId,
      type: "result",
      payload: {
        rgbaPngBytes: processed,
        width: canvas.width,
        height: canvas.height,
        timingMs: totalMs,
        modelName,
        timings: { ...timings, total: totalMs },
      },
    };
    (
      postMessage as unknown as (
        message: unknown,
        transfer: Transferable[],
      ) => void
    )(resultMessage, [processed]);
  } catch (err) {
    postMessage({
      id: processId,
      type: "error",
      payload: { message: errorMessage(err) },
    });
  }
};

function resolveImglyDevice(
  device: DevicePreference,
  webgpu: boolean,
): "gpu" | "cpu" {
  if (device === "cpu") return "cpu";
  if (device === "gpu") return "gpu";
  return webgpu ? "gpu" : "cpu";
}

async function runImgly(
  blob: Blob,
  model: ImglyModel,
  device: "gpu" | "cpu",
  onProgress: (info: {
    phase: string;
    message: string;
    loaded?: number;
    total?: number;
  }) => void,
): Promise<Blob> {
  let lastProgress = 0;
  return removeBackground(blob, {
    ...(imglyPublicPath ? { publicPath: imglyPublicPath } : {}),
    model,
    device,
    output: { format: "image/png" },
    progress: (phase: string, loaded: number, total: number) => {
      const pct = total > 0 ? (loaded / total) * 100 : 0;
      const isDownload = isDownloadPhase(phase);
      const isCompute = isComputePhase(phase);
      if (Math.abs(pct - lastProgress) > 2 || !isDownload) {
        lastProgress = pct;
        onProgress({
          phase,
          loaded,
          total,
          message: isDownload
            ? `Downloading model ${Math.round(pct)}%`
            : isCompute
              ? "Processing image…"
              : "Processing…",
        });
      }
    },
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isDownloadFailure(err: unknown): boolean {
  const message = errorMessage(err);
  return /download BiRefNet|Failed to fetch|NetworkError|Load failed/i.test(
    message,
  );
}
