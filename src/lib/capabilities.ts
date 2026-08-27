export type QualityTier = "fast" | "quality" | "pro";

export async function detectWebGPU(): Promise<{
  supported: boolean;
  shaderF16: boolean;
}> {
  if (!("gpu" in navigator)) {
    return { supported: false, shaderF16: false };
  }
  // @ts-expect-error nonstandard
  const adapter = await navigator.gpu?.requestAdapter?.({
    powerPreference: "high-performance",
  });
  if (!adapter) {
    return { supported: false, shaderF16: false };
  }
  const shaderF16 = adapter.features?.has?.("shader-f16") ?? false;
  return { supported: true, shaderF16 };
}

export function deviceMemoryTier(): number {
  const dm = (navigator as any).deviceMemory ?? 4;
  if (dm >= 12) return 3;
  if (dm >= 8) return 2;
  if (dm >= 4) return 1;
  return 0;
}

export function recommendedQualityTier({
  webgpu,
  fp16,
  memoryTier,
}: {
  webgpu: boolean;
  fp16: boolean;
  memoryTier: number;
}): QualityTier {
  if (!webgpu || memoryTier === 0) return "fast";

  // Keep the default conservative: `pro` downloads BiRefNet (~94MB) and needs
  // WebGPU, so expose it as a manual upgrade instead of auto-selecting it.
  if (fp16 && memoryTier >= 2) return "quality";

  return "quality";
}
