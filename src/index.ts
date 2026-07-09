/**
 * @salient/halo-gorelo-adapter — a Halo PSA-shaped API surface that translates
 * calls to the Gorelo API behind a swappable provider, governed by a typed
 * capability manifest.
 */

export { HaloClient } from "./client.js";
export type {
  Auth,
  ClientConfig,
  GapMode,
  GoreloAuth,
  HaloAuth,
  RetryConfig,
  Timers,
} from "./config.js";
export type { Logger, LogLevel } from "./logger.js";
export {
  AuthError,
  CapabilityUnsupportedError,
  HaloAdapterError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "./errors.js";
export type { ProviderName } from "./errors.js";
export type { HaloPage, PageParams } from "./pagination.js";

export type {
  Backend,
  ListParams,
  TicketBackend,
  ClientBackend,
  SiteBackend,
  UserBackend,
  AssetBackend,
  LookupBackend,
  AlertBackend,
} from "./backend.js";

export type * from "./models/halo.js";

// Backends are exported for advanced use (custom composition, testing).
export { HaloBackend } from "./backends/halo/halo-backend.js";
export { GoreloBackend, manifestImplementationDrift } from "./backends/gorelo/gorelo-backend.js";

// Manifest is re-exported here and under the `/manifest` subpath.
export {
  goreloManifest,
  manifestEntries,
  coverageSummary,
  isSupported,
  opKey,
} from "./manifest/index.js";
export type {
  CapabilityManifest,
  CapabilityStatus,
  CoverageSummary,
  FieldMapEntry,
  ManifestEntry,
  OperationKey,
  OperationName,
  ResourceName,
} from "./manifest/index.js";
