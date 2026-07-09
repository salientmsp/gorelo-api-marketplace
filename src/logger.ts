/** Minimal structured logger interface with a secret-redacting default. */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

const SECRET_KEYS = /^(authorization|x-api-key|client_secret|clientsecret|secret|token|password)$/i;

/** Redact obvious secret fields from a metadata object before logging. */
export function redact(meta: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!meta) return meta;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = SECRET_KEYS.test(k) ? "[redacted]" : v;
  }
  return out;
}

/** A logger that discards everything. Default when none is injected. */
export const noopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

/** Wrap any logger so every call is redacted first. */
export function redactingLogger(inner: Logger): Logger {
  return {
    debug: (m, meta) => inner.debug(m, redact(meta)),
    info: (m, meta) => inner.info(m, redact(meta)),
    warn: (m, meta) => inner.warn(m, redact(meta)),
    error: (m, meta) => inner.error(m, redact(meta)),
  };
}
