/* eslint-disable no-restricted-globals */
import { removeBackground } from '@imgly/background-removal';

type InitMessage = {
  id: string;
  type: 'init';
  payload: { tier: 'fast' | 'quality' | 'pro'; preferFp16: boolean; refineEdgesDefault: boolean };
};

type ProcessMessage = {
  id: string;
  type: 'process';
  payload: {
    image: { kind: 'blob'; mime: string; bytes: number[] };
    options: {
      tier: 'fast' | 'quality' | 'pro';
      refineEdges: boolean;
      bgMode: 'transparent' | 'color' | 'image';
      bgColor: string;
      bgImageBytes?: number[];
      exportFormat: 'png' | 'webp';
    };
  };
};

type DisposeMessage = { id: string; type: 'dispose' };

type Message = InitMessage | ProcessMessage | DisposeMessage;

let lastTier: 'fast' | 'quality' | 'pro' = 'quality';

self.onmessage = async (event: MessageEvent<Message>) => {
  const { id, type } = event.data;
  if (type === 'init') {
    lastTier = event.data.payload.tier;
    postMessage({
      id,
      type: 'progress',
      payload: { phase: 'init', message: 'Worker ready' }
    });
    return;
  }

  if (type === 'dispose') {
    postMessage({
      id,
      type: 'progress',
      payload: { phase: 'dispose', message: 'Disposed' }
    });
    return;
  }

  if (type !== 'process') return;

  const t0 = performance.now();
  const processId = id;
  try {
    const bytes = new Uint8Array(event.data.payload.image.bytes);
    const blob = new Blob([bytes], { type: event.data.payload.image.mime });

    postMessage({
      id: processId,
      type: 'progress',
      payload: { phase: 'download', message: 'Preparing…' }
    });

    const model: 'isnet' | 'isnet_fp16' | 'isnet_quint8' =
      lastTier === 'pro'
        ? 'isnet_fp16'
        : lastTier === 'fast'
          ? 'isnet_quint8'
          : 'isnet';

    let lastProgress = 0;
    const resultBlob = await removeBackground(blob, {
      model,
      output: { format: 'image/png' },
      progress: (phase: string, loaded: number, total: number) => {
        const pct = total > 0 ? (loaded / total) * 100 : 0;
        if (Math.abs(pct - lastProgress) > 2 || phase !== 'download') {
          lastProgress = pct;
          postMessage({
            id: processId,
            type: 'progress',
            payload: {
              phase,
              message:
                phase === 'download'
                  ? `Downloading model ${Math.round(pct)}%`
                  : phase === 'compute'
                    ? 'Processing image…'
                    : 'Processing…',
              loaded,
              total
            }
          });
        }
      }
    });

    postMessage({
      id: processId,
      type: 'progress',
      payload: { phase: 'composite', message: 'Compositing…' }
    });

    const bitmap = await createImageBitmap(resultBlob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable');

    if (event.data.payload.options.bgMode === 'color') {
      ctx.fillStyle = event.data.payload.options.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (event.data.payload.options.bgMode === 'image') {
      const bgBytes = event.data.payload.options.bgImageBytes;
      if (bgBytes) {
        const bgBlob = new Blob([new Uint8Array(bgBytes)]);
        const bgBitmap = await createImageBitmap(bgBlob);
        ctx.drawImage(bgBitmap, 0, 0, canvas.width, canvas.height);
      }
    }

    ctx.drawImage(bitmap, 0, 0);

    const exportMime =
      event.data.payload.options.exportFormat === 'webp'
        ? 'image/webp'
        : 'image/png';
    const exportBlob = await canvas.convertToBlob({ type: exportMime });
    const processed = await exportBlob.arrayBuffer();
    const pngBytes = new Uint8Array(processed);

    const timingMs = Math.round(performance.now() - t0);

    postMessage({
      id: processId,
      type: 'result',
      payload: {
        rgbaPngBytes: Array.from(pngBytes),
        width: canvas.width,
        height: canvas.height,
        timingMs
      }
    });
  } catch (err) {
    postMessage({
      id: processId,
      type: 'error',
      payload: { message: (err as Error).message }
    });
  }
};

