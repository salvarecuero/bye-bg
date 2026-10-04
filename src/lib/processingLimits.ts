/** Max inference passes per image — higher values burn time for little gain. */
export const MAX_PASSES = 3;
export const MIN_PASSES = 1;
export const DEFAULT_PASSES = 1;

/** Soft cap on batch queue size to avoid browser memory meltdown. */
export const MAX_BATCH_ITEMS = 40;

export function clampPasses(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PASSES;
  return Math.min(MAX_PASSES, Math.max(MIN_PASSES, Math.round(n)));
}
