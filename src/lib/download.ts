import JSZip from 'jszip';
import type { BatchItem } from '../types/batch';

export function downloadFile(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}

export function getOutputFilename(originalName: string, format: 'png' | 'webp'): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  return `${baseName}-bye-bg.${format}`;
}

export async function downloadBatchItem(item: BatchItem, format: 'png' | 'webp'): Promise<void> {
  if (!item.result?.outputUrl) return;

  const filename = getOutputFilename(item.originalName, format);
  downloadFile(item.result.outputUrl, filename);
}

export async function downloadAllSeparate(
  items: BatchItem[],
  format: 'png' | 'webp'
): Promise<void> {
  const completed = items.filter(item => item.status === 'completed' && item.result);

  for (const item of completed) {
    await downloadBatchItem(item, format);
    // Small delay to prevent browser blocking
    await new Promise(resolve => setTimeout(resolve, 150));
  }
}

export async function downloadAsZip(
  items: BatchItem[],
  format: 'png' | 'webp'
): Promise<void> {
  const zip = new JSZip();
  const completed = items.filter(item => item.status === 'completed' && item.result);

  if (completed.length === 0) return;

  // Track filenames to handle duplicates
  const usedFilenames = new Set<string>();

  for (const item of completed) {
    if (!item.result?.outputBytes) continue;

    let filename = getOutputFilename(item.originalName, format);

    // Handle duplicate filenames
    if (usedFilenames.has(filename)) {
      let counter = 1;
      const baseName = filename.replace(/\.[^/.]+$/, '');
      const ext = format;
      while (usedFilenames.has(`${baseName} (${counter}).${ext}`)) {
        counter++;
      }
      filename = `${baseName} (${counter}).${ext}`;
    }

    usedFilenames.add(filename);
    zip.file(filename, item.result.outputBytes);
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const url = URL.createObjectURL(zipBlob);
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadFile(url, `bye-bg-batch-${timestamp}.zip`);
  URL.revokeObjectURL(url);
}
