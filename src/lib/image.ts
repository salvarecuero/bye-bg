export async function decodeImage(bytes: Uint8Array): Promise<ImageBitmap> {
  const blob = new Blob([bytes as BlobPart]);
  return createImageBitmap(blob);
}

export function downscale(
  bitmap: ImageBitmap,
  maxDim: number
): { bitmap: OffscreenCanvas; scale: number } {
  const { width, height } = bitmap;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));
  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2d context unavailable');
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  return { bitmap: canvas, scale };
}

export function drawComposite(
  fg: ImageBitmap | OffscreenCanvas,
  alpha: ImageData,
  bgMode: 'transparent' | 'color',
  bgColor: string,
  outSize: { width: number; height: number }
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(outSize.width, outSize.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');

  if (bgMode === 'color') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.putImageData(alpha, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.drawImage(fg as any, 0, 0, canvas.width, canvas.height);

  return canvas;
}

export async function toBlobBytes(
  canvas: OffscreenCanvas,
  mime: 'image/png' | 'image/webp'
): Promise<Uint8Array> {
  const blob = await canvas.convertToBlob({ type: mime });
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

