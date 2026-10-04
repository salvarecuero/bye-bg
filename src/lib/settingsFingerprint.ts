export type SettingsFingerprint = {
  quality: "fast" | "quality" | "pro";
  refine: boolean;
  bgMode: "transparent" | "color" | "image";
  bgColor: string;
  bgImageVersion: number;
  exportFormat: "png" | "webp";
  device: "auto" | "gpu" | "cpu";
  passes: number;
};

export function buildSettingsFingerprint(
  settings: SettingsFingerprint,
): SettingsFingerprint {
  return { ...settings };
}

export function settingsEqual(
  a: SettingsFingerprint | null | undefined,
  b: SettingsFingerprint | null | undefined,
): boolean {
  if (!a || !b) return false;
  return (
    a.quality === b.quality &&
    a.refine === b.refine &&
    a.bgMode === b.bgMode &&
    a.bgColor === b.bgColor &&
    a.bgImageVersion === b.bgImageVersion &&
    a.exportFormat === b.exportFormat &&
    a.device === b.device &&
    a.passes === b.passes
  );
}
