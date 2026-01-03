export type BackendKind = 'webgpu-fp16' | 'webgpu-fp32' | 'wasm';

export async function detectWebGPU(): Promise<{
  supported: boolean;
  shaderF16: boolean;
}> {
  if (!('gpu' in navigator)) {
    return { supported: false, shaderF16: false };
  }
  // @ts-expect-error nonstandard
  const adapter = await navigator.gpu?.requestAdapter?.({
    powerPreference: 'high-performance'
  });
  if (!adapter) {
    return { supported: false, shaderF16: false };
  }
  const shaderF16 = adapter.features?.has?.('shader-f16') ?? false;
  return { supported: true, shaderF16 };
}

export function deviceMemoryTier(): number {
  const dm = (navigator as any).deviceMemory ?? 4;
  if (dm >= 12) return 3;
  if (dm >= 8) return 2;
  if (dm >= 4) return 1;
  return 0;
}

