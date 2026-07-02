export function refineAlphaEdges(
  imageData: ImageData,
  options: {
    strength?: number;
    transparentThreshold?: number;
    opaqueThreshold?: number;
  } = {},
): ImageData {
  const { data, width, height } = imageData;
  const strength = options.strength ?? 0.45;
  const transparentThreshold = options.transparentThreshold ?? 8;
  const opaqueThreshold = options.opaqueThreshold ?? 247;
  const alpha = new Uint8ClampedArray(width * height);
  const blurred = new Uint8ClampedArray(width * height);

  for (let i = 0, p = 3; i < alpha.length; i++, p += 4) {
    const a = data[p];
    alpha[i] = a < transparentThreshold ? 0 : a > opaqueThreshold ? 255 : a;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;

        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          sum += alpha[yy * width + xx];
          count++;
        }
      }

      blurred[y * width + x] = Math.round(sum / count);
    }
  }

  for (let i = 0, p = 3; i < alpha.length; i++, p += 4) {
    const original = alpha[i];
    if (original === 0 || original === 255) {
      data[p] = original;
      continue;
    }

    const edgeWeight = 1 - Math.abs(original - 128) / 128;
    const mix = Math.max(0, Math.min(1, strength * edgeWeight));
    data[p] = Math.round(original + (blurred[i] - original) * mix);
  }

  return imageData;
}
