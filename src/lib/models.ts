export type QualityTier = "fast" | "quality" | "pro";

export const FAST_MODEL_ID = "isnet_quint8";
export const BALANCED_MODEL_ID = "isnet_fp16";
export const BIREFNET_MODEL_ID = "birefnet_lite_512_fp16";

export type ImglyModel = typeof FAST_MODEL_ID | typeof BALANCED_MODEL_ID;

export const QUALITY_TIERS: {
  key: QualityTier;
  label: string;
  model: string;
  size: string;
  description: string;
}[] = [
  {
    key: "fast",
    label: "Fast",
    model: FAST_MODEL_ID,
    size: "~5MB",
    description:
      "Lightweight quantized model. Quick results, slightly lower edge quality.",
  },
  {
    key: "quality",
    label: "Balanced",
    model: BALANCED_MODEL_ID,
    size: "~80MB",
    description:
      "Balanced model for most images. Good quality with reasonable speed.",
  },
  {
    key: "pro",
    label: "Pro",
    model: BIREFNET_MODEL_ID,
    size: "~94MB",
    description:
      "BiRefNet Lite 512 FP16. Better hair, transparency, and fine edges. WebGPU only; falls back to Balanced if GPU inference fails.",
  },
];

export function imglyModelForTier(tier: QualityTier): ImglyModel {
  return tier === "fast" ? FAST_MODEL_ID : BALANCED_MODEL_ID;
}

export function selectedModelId(tier: QualityTier): string {
  const match = QUALITY_TIERS.find((q) => q.key === tier);
  return match?.model ?? BALANCED_MODEL_ID;
}
