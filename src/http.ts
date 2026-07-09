/**
 * Thin fetch wrapper: JSON in/out, per-request timeout, and exponential-backoff
 * retry for transient failures (429 / 5xx / network). No heavy SDK deps — uses
 * the injected `fetch` (global by default).
 */

import type { ResolvedConfig } from "./config.js";
import { errorFromHttp, HaloAdapterError, RateLimitError } from "./errors.js";
import type { ProviderName } from "./errors.js";
import { redactingLogger } from "./logger.js";

export interface RequestOptions {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  /** Query params; `undefined` values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON body. */
  body?: unknown;
  headers?: Record<string, string>;
  resource?: string;
  operation?: string;
}

export interface HttpResponse<T> {
  status: number;
  data: T;
  headers: Headers;
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions["query"]): string {
  const base = baseUrl.replace(/\/+$/, "");
  const rel = path.replace(/^\/+/, "");
  const url = new URL(`${base}/${rel}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function isRetryable(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function jitteredBackoff(attempt: number, baseMs: number, maxMs: number): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  // Full jitter within a deterministic-per-attempt band, no Math.random needed.
  return Math.floor(exp / 2 + (exp / 2) * ((attempt % 3) / 3));
}

/**
 * A configured HTTP client. Auth headers are supplied per request by the
 * backend via `authHeaders`, so token refresh can happen just-in-time.
 */
export class HttpClient {
  private readonly cfg: ResolvedConfig;
  private readonly provider: ProviderName;
  private readonly authHeaders: () => Promise<Record<string, string>>;

  constructor(
    cfg: ResolvedConfig,
    provider: ProviderName,
    authHeaders: () => Promise<Record<string, string>>,
  ) {
    this.cfg = cfg;
    this.provider = provider;
    this.authHeaders = authHeaders;
  }

  async request<T>(opts: RequestOptions): Promise<HttpResponse<T>> {
    const url = buildUrl(this.cfg.baseUrl, opts.path, opts.query);
    const logger = redactingLogger(this.cfg.logger);
    const { maxAttempts, baseDelayMs, maxDelayMs } = this.cfg.retry;

    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const auth = await this.authHeaders();
      const headers: Record<string, string> = {
        accept: "application/json",
        ...auth,
        ...opts.headers,
      };
      let bodyInit: string | undefined;
      if (opts.body !== undefined && opts.method !== "GET") {
        headers["content-type"] = "application/json";
        bodyInit = JSON.stringify(opts.body);
      }

      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), this.cfg.timeoutMs);
      try {
        logger.debug("http.request", {
          provider: this.provider,
          method: opts.method,
          url,
          attempt,
        });
        const res = await this.cfg.fetch(url, {
          method: opts.method,
          headers,
          body: bodyInit,
          signal: ac.signal,
        });

        if (res.ok) {
          const data = (await parseBody(res)) as T;
          return { status: res.status, data, headers: res.headers };
        }

        // Non-2xx: decide retry vs throw.
        const text = await safeText(res);
        if (isRetryable(res.status) && attempt < maxAttempts - 1) {
          const retryAfter = parseRetryAfter(res.headers);
          const delay = retryAfter != null ? retryAfter * 1000 : jitteredBackoff(attempt, baseDelayMs, maxDelayMs);
          logger.warn("http.retry", { provider: this.provider, status: res.status, delay, attempt });
          await this.cfg.timers.sleep(delay);
          continue;
        }
        throw errorFromHttp(
          res.status,
          `${opts.method} ${opts.path} failed: ${res.status} ${text.slice(0, 500)}`,
          { provider: this.provider, resource: opts.resource, operation: opts.operation },
          { retryAfterSeconds: parseRetryAfter(res.headers) },
        );
      } catch (err) {
        clearTimeout(timer);
        // Adapter errors that are non-retryable propagate immediately.
        if (err instanceof HaloAdapterError && !(err instanceof RateLimitError)) throw err;
        lastError = err;
        const isLast = attempt >= maxAttempts - 1;
        if (isLast) {
          if (err instanceof HaloAdapterError) throw err;
          throw new HaloAdapterError(
            `${opts.method} ${opts.path} failed after ${maxAttempts} attempts: ${(err as Error).message}`,
            { code: "NETWORK", provider: this.provider, resource: opts.resource, operation: opts.operation, cause: err },
          );
        }
        const delay = jitteredBackoff(attempt, baseDelayMs, maxDelayMs);
        logger.warn("http.retry.network", { provider: this.provider, delay, attempt });
        await this.cfg.timers.sleep(delay);
        continue;
      } finally {
        clearTimeout(timer);
      }
    }
    throw new HaloAdapterError("unreachable retry exit", {
      code: "INTERNAL",
      provider: this.provider,
      cause: lastError,
    });
  }
}

async function parseBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  const text = await res.text();
  if (text.length === 0) return undefined;
  if (ct.includes("json") || ct.includes("text/plain")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function parseRetryAfter(headers: Headers): number | undefined {
  const raw = headers.get("retry-after");
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}
