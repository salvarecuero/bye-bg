export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    // ClipboardItem requires PNG format
    const pngBlob = blob.type === 'image/png' ? blob : await convertToPng(blob);

    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    return true;
  } catch (error) {
    console.error('Failed to copy image:', error);
    return false;
  }
}

async function convertToPng(blob: Blob): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        pngBlob => {
          URL.revokeObjectURL(url);
          if (pngBlob) resolve(pngBlob);
          else reject(new Error('Failed to convert to PNG'));
        },
        'image/png'
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export function isClipboardSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard !== 'undefined' &&
    typeof navigator.clipboard.write === 'function'
  );
}
