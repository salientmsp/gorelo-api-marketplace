/**
 * Unified error model. Every failure the adapter surfaces is a
 * {@link HaloAdapterError} subclass carrying enough context to act on without a
 * stack trace. Capability gaps in particular carry the manifest entry so callers
 * get an actionable, self-documenting signal.
 */

import type { ManifestEntry } from "./manifest/types.js";

export type ProviderName = "halo" | "gorelo";

export interface HaloAdapterErrorContext {
  code: string;
  httpStatus?: number;
  provider: ProviderName;
  resource?: string;
  operation?: string;
  cause?: unknown;
}

/** Base class for every error the adapter throws. */
export class HaloAdapterError extends Error {
  readonly code: string;
  readonly httpStatus: number | undefined;
  readonly provider: ProviderName;
  readonly resource: string | undefined;
  readonly operation: string | undefined;

  constructor(message: string, ctx: HaloAdapterErrorContext) {
    super(message, ctx.cause !== undefined ? { cause: ctx.cause } : undefined);
    this.name = new.target.name;
    this.code = ctx.code;
    this.httpStatus = ctx.httpStatus;
    this.provider = ctx.provider;
    this.resource = ctx.resource;
    this.operation = ctx.operation;
  }
}

/**
 * Thrown when an operation has no backend path (manifest status
 * `missing`/`planned`). Carries the manifest entry so the caller can inspect
 * `status`, `goreloRef`, and `caveats` programmatically.
 */
export class CapabilityUnsupportedError extends HaloAdapterError {
  readonly manifest: ManifestEntry;

  constructor(manifest: ManifestEntry, provider: ProviderName) {
    super(
      `Operation ${manifest.resource}.${manifest.operation} is "${manifest.status}" on ${provider}: ` +
        (manifest.caveats[0] ?? "no backend endpoint available") +
        ` (goreloRef: ${manifest.goreloRef ? manifest.goreloRef.join(", ") : "none"})`,
      {
        code: "CAPABILITY_UNSUPPORTED",
        provider,
        resource: manifest.resource,
        operation: manifest.operation,
      },
    );
    this.manifest = manifest;
  }
}

export class AuthError extends HaloAdapterError {
  constructor(message: string, ctx: Omit<HaloAdapterErrorContext, "code">) {
    super(message, { ...ctx, code: "AUTH" });
  }
}

export class RateLimitError extends HaloAdapterError {
  /** Seconds to wait before retrying, when the backend supplied `Retry-After`. */
  readonly retryAfterSeconds: number | undefined;

  constructor(
    message: string,
    ctx: Omit<HaloAdapterErrorContext, "code">,
    retryAfterSeconds?: number,
  ) {
    super(message, { ...ctx, code: "RATE_LIMIT" });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class NotFoundError extends HaloAdapterError {
  constructor(message: string, ctx: Omit<HaloAdapterErrorContext, "code">) {
    super(message, { ...ctx, code: "NOT_FOUND" });
  }
}

export class ValidationError extends HaloAdapterError {
  /** Field-level detail, when the backend or translator can provide it. */
  readonly details: Record<string, string> | undefined;

  constructor(
    message: string,
    ctx: Omit<HaloAdapterErrorContext, "code">,
    details?: Record<string, string>,
  ) {
    super(message, { ...ctx, code: "VALIDATION" });
    this.details = details;
  }
}

/** Map an HTTP status to the right adapter error subclass. */
export function errorFromHttp(
  status: number,
  message: string,
  ctx: Omit<HaloAdapterErrorContext, "code" | "httpStatus">,
  extra?: { retryAfterSeconds?: number; details?: Record<string, string> },
): HaloAdapterError {
  const base = { ...ctx, httpStatus: status };
  switch (status) {
    case 401:
    case 403:
      return new AuthError(message, base);
    case 404:
      return new NotFoundError(message, base);
    case 422:
    case 400:
      return new ValidationError(message, base, extra?.details);
    case 429:
      return new RateLimitError(message, base, extra?.retryAfterSeconds);
    default:
      return new HaloAdapterError(message, { ...base, code: status >= 500 ? "SERVER" : "HTTP" });
  }
}
