export * from "./types.js";
export { goreloManifest, manifestEntries } from "./manifest.js";

import type { CapabilityStatus, ManifestEntry } from "./types.js";
import { isSupported } from "./types.js";
import { manifestEntries } from "./manifest.js";

export interface CoverageSummary {
  total: number;
  byStatus: Record<CapabilityStatus, number>;
  supported: number;
  supportedPct: number;
}

/** Compute a coverage summary over the manifest (used by the matrix + reports). */
export function coverageSummary(entries: readonly ManifestEntry[] = manifestEntries): CoverageSummary {
  const byStatus: Record<CapabilityStatus, number> = { full: 0, partial: 0, missing: 0, planned: 0 };
  for (const e of entries) byStatus[e.status]++;
  const supported = byStatus.full + byStatus.partial;
  return {
    total: entries.length,
    byStatus,
    supported,
    supportedPct: entries.length === 0 ? 0 : Math.round((supported / entries.length) * 1000) / 10,
  };
}

export { isSupported };
