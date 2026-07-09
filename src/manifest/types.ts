/**
 * Capability manifest types — the single source of truth for what the adapter
 * can and cannot do against a given backend.
 *
 * Every `(resource, operation)` pair the public surface exposes has exactly one
 * {@link ManifestEntry}. The feature matrix (`FEATURE-MATRIX.md` /
 * `feature-matrix.json`) is *generated* from these entries and must never be
 * hand-edited. A CI gate asserts the manifest and the `GoreloBackend`
 * implementation agree (see `scripts/generate-matrix.ts` and the gate test).
 */

/** Coverage status of a single operation against a backend. */
export type CapabilityStatus =
  /** Clean 1:1 mapping, no field loss. */
  | "full"
  /** Works, but with field loss, synthesized behavior, or semantic caveats. */
  | "partial"
  /** No backend endpoint exists; the operation cannot be served. */
  | "missing"
  /** Backend is expected to add this; treated like `missing` at runtime. */
  | "planned";

/** Direction a field mapping applies to. */
export type FieldDirection =
  /** Halo request field → Gorelo request field. */
  | "in"
  /** Gorelo response field → Halo response field. */
  | "out"
  /** Mapped on both request and response. */
  | "both";

/** A single Halo↔Gorelo field correspondence. */
export interface FieldMapEntry {
  /** Halo (public contract) field, dot-pathed for nested shapes. */
  halo: string;
  /** Gorelo field, or `null` when Halo has no Gorelo source (never faked). */
  gorelo: string | null;
  direction: FieldDirection;
  /** Human note describing any transform (enum map, id-type bridge, etc.). */
  transform?: string;
}

/** Canonical resource names on the public (Halo-shaped) surface. */
export type ResourceName =
  | "tickets"
  | "actions"
  | "clients"
  | "sites"
  | "users"
  | "assets"
  | "ticketStatuses"
  | "ticketTypes"
  | "ticketTags"
  | "teams"
  | "agents"
  | "invoices"
  | "contracts"
  | "alerts";

/** Canonical operation names. */
export type OperationName =
  | "list"
  | "get"
  | "create"
  | "update"
  | "delete";

/** Stable `"resource.operation"` key used to index the manifest. */
export type OperationKey = `${ResourceName}.${OperationName}`;

/** One manifest entry: everything known about one operation on one backend. */
export interface ManifestEntry {
  resource: ResourceName;
  operation: OperationName;
  status: CapabilityStatus;
  /** Gorelo endpoint(s) this maps to, or `null` when unsupported. */
  goreloRef: string[] | null;
  fieldMap: FieldMapEntry[];
  /** Halo query/body params Gorelo ignores or rejects. */
  unsupportedParams: string[];
  /** Semantic differences a caller must know (pagination, enums, ids, tz). */
  caveats: string[];
}

/** The full manifest, keyed by {@link OperationKey}. */
export type CapabilityManifest = Record<OperationKey, ManifestEntry>;

/** Build the stable key for a `(resource, operation)` pair. */
export function opKey(resource: ResourceName, operation: OperationName): OperationKey {
  return `${resource}.${operation}`;
}

/** True when an operation is servable (as opposed to a declared gap). */
export function isSupported(status: CapabilityStatus): boolean {
  return status === "full" || status === "partial";
}
