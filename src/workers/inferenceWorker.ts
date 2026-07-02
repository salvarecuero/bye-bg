import { removeBackground } from "@imgly/background-removal";
import { refineAlphaEdges } from "../lib/image";

// Phase detection helpers - the library sends phases like 'fetch:/models/isnet' and 'compute:inference'
const isDownloadPhase = (phase: string) => phase.startsWith("fetch:");
const isComputePhase = (phase: string) => phase.startsWith("compute:");
const imglyPublicPath = import.meta.env.VITE_IMGLY_PUBLIC_PATH as
  | string
  | undefined;

type InitMessage = {
  id: string;
  type: "init";
  payload: {
    tier: "fast" | "quality" | "pro";
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
      tier: "fast" | "quality" | "pro";
      refineEdges: boolean;
      bgMode: "transparent" | "color" | "image";
      bgColor: string;
      bgImageBytes?: ArrayBuffer;
      exportFormat: "png" | "webp";
      device?: "auto" | "gpu" | "cpu";
    };
  };
};

type DisposeMessage = { id: string; type: "dispose" };

type Message = InitMessage | ProcessMessage | DisposeMessage;

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

  // Phase timing tracking
  const timings: { download?: number; inference?: number; composite?: number } =
    {};
  let phaseStart = t0;
  let currentPhase = ""; // Will be set by first progress callback

  try {
    const bytes = new Uint8Array(event.data.payload.image.bytes);
    const blob = new Blob([bytes], { type: event.data.payload.image.mime });

    const tier = event.data.payload.options.tier;
    const device = event.data.payload.options.device || "auto";
    const model: "isnet" | "isnet_fp16" | "isnet_quint8" =
      tier === "pro"
        ? "isnet_fp16"
        : tier === "fast"
          ? "isnet_quint8"
          : "isnet";

    postMessage({
      id: processId,
      type: "progress",
      payload: { phase: "download", message: "Preparing…", modelName: model },
    });

    // Map device preference to library config.
    // @imgly/background-removal uses 'gpu' | 'cpu' | undefined (auto).
    const deviceConfig = device === "auto" ? undefined : device;

    let lastProgress = 0;
    const resultBlob = await removeBackground(blob, {
      ...(imglyPublicPath ? { publicPath: imglyPublicPath } : {}),
      model,
      device: deviceConfig,
      output: { format: "image/png" },
      progress: (phase: string, loaded: number, total: number) => {
        const pct = total > 0 ? (loaded / total) * 100 : 0;

        // Track phase transitions for timing.
        const wasDownload = isDownloadPhase(currentPhase);
        const wasCompute = isComputePhase(currentPhase);
        const isDownload = isDownloadPhase(phase);
        const isCompute = isComputePhase(phase);
        const phaseTypeChanged =
          wasDownload !== isDownload || wasCompute !== isCompute;

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

        if (Math.abs(pct - lastProgress) > 2 || !isDownload) {
          lastProgress = pct;
          postMessage({
            id: processId,
            type: "progress",
            payload: {
              phase,
              message: isDownload
                ? `Downloading model ${Math.round(pct)}%`
                : isCompute
                  ? "Processing image…"
                  : "Processing…",
              loaded,
              total,
              modelName: model,
              timings: { ...timings },
            },
          });
        }
      },
    });

    // Track compute phase end if still in compute
    if (isComputePhase(currentPhase)) {
      timings.inference = Math.round(performance.now() - phaseStart);
      phaseStart = performance.now();
    }

    postMessage({
      id: processId,
      type: "progress",
      payload: {
        phase: "composite",
        message: "Compositing…",
        modelName: model,
        timings: { ...timings },
      },
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

    // Track composite time
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
        modelName: model,
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
      payload: { message: (err as Error).message },
    });
  }
};
