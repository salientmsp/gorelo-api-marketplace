/**
 * Enum maps. Gorelo's ticket priority (0-4), ticket source (1-6), and alert
 * severity (1-4) are inline enums with NO lookup endpoint, so the maps live in
 * code with tests. The spec publishes only the numeric ranges, not names, so
 * these are documented defaults — override at the call site if a tenant's Halo
 * priority scheme differs.
 */

import { ValidationError } from "../../errors.js";
import type {
  GoreloAlertLevel,
  GoreloTicketPriority,
  GoreloTicketSource,
} from "../../models/gorelo.js";

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Halo `priority_id` → Gorelo `PublicTicketPriority` (0-4).
 * Default is a clamped identity: Halo priority ids are tenant-defined, so we
 * cannot assume names. Callers with a known scheme should pass the Gorelo enum
 * directly on `HaloTicketCreate` if they need exact control.
 */
export function toGoreloPriority(haloPriorityId: number | undefined): GoreloTicketPriority | undefined {
  if (haloPriorityId === undefined) return undefined;
  return clampInt(haloPriorityId, 0, 4) as GoreloTicketPriority;
}

/** Common Halo source names → Gorelo `TicketSource` (1-6). */
const SOURCE_NAME_MAP: Record<string, GoreloTicketSource> = {
  email: 1,
  phone: 2,
  portal: 3,
  web: 3,
  agent: 4,
  api: 5,
  rmm: 6,
  monitoring: 6,
};

/**
 * Halo `source` (string name or numeric id) → Gorelo `TicketSource` (1-6).
 * Unknown strings throw a ValidationError rather than guessing.
 */
export function toGoreloSource(source: number | string | undefined): GoreloTicketSource | undefined {
  if (source === undefined) return undefined;
  if (typeof source === "number") return clampInt(source, 1, 6) as GoreloTicketSource;
  const key = source.trim().toLowerCase();
  const mapped = SOURCE_NAME_MAP[key];
  if (mapped === undefined) {
    throw new ValidationError(`Unknown Halo ticket source "${source}"; cannot map to Gorelo TicketSource (1-6)`, {
      provider: "gorelo",
      resource: "tickets",
      operation: "create",
    });
  }
  return mapped;
}

/** Halo alert severity → Gorelo `AlertLevel` (1-4). */
export function toGoreloAlertLevel(severity: number): GoreloAlertLevel {
  return clampInt(severity, 1, 4) as GoreloAlertLevel;
}
