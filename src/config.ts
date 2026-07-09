import type { Logger } from "./logger.js";

/** How the adapter behaves when an operation is unsupported by the backend. */
export type GapMode =
  /** Throw {@link CapabilityUnsupportedError} (default). */
  | "throw"
  /** Return a best-effort empty result and warn via the logger. */
  | "degrade";

/** Retry/backoff policy for transient failures (429 / 5xx / network). */
export interface RetryConfig {
  /** Max attempts including the first. Default 3. */
  maxAttempts: number;
  /** Base delay in ms for exponential backoff. Default 500. */
  baseDelayMs: number;
  /** Cap on any single backoff delay in ms. Default 10_000. */
  maxDelayMs: number;
}

export const defaultRetry: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
};

/** Halo OAuth2 client-credentials auth. */
export interface HaloAuth {
  kind: "halo";
  /** Auth server base, e.g. `https://<tenant>.halopsa.com/auth`. */
  authUrl: string;
  clientId: string;
  clientSecret: string;
  /** OAuth scope; Halo commonly uses `all`. */
  scope?: string;
  /** Optional tenant hint some Halo deployments require. */
  tenant?: string;
}

/** Gorelo API-key auth. */
export interface GoreloAuth {
  kind: "gorelo";
  /** Value for the `X-API-Key` header. */
  apiKey: string;
}

export type Auth = HaloAuth | GoreloAuth;

/** Injectable clock/sleep, so tests can run without real timers. */
export interface Timers {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const realTimers: Timers = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

/** Full client options. One object per client. */
export interface ClientConfig {
  provider: "halo" | "gorelo";
  auth: Auth;
  /**
   * Resource-server base URL.
   * - Halo: `https://<tenant>.halopsa.com/api`
   * - Gorelo: `https://api.<region>.gorelo.io`
   */
  baseUrl: string;
  /** Gap behavior. Default `"throw"`. */
  mode?: GapMode;
  /** Per-request timeout in ms. Default 30_000. */
  timeoutMs?: number;
  retry?: Partial<RetryConfig>;
  logger?: Logger;
  /** Inject a custom fetch (e.g. undici) or a test double. Defaults to global fetch. */
  fetch?: typeof fetch;
  /** Inject timers for tests. Defaults to real timers. */
  timers?: Timers;
}

/** Config after defaults are applied. */
export interface ResolvedConfig {
  provider: "halo" | "gorelo";
  auth: Auth;
  baseUrl: string;
  mode: GapMode;
  timeoutMs: number;
  retry: RetryConfig;
  logger: Logger;
  fetch: typeof fetch;
  timers: Timers;
}
