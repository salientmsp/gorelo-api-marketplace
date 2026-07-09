import type { ClientConfig, Timers } from "../src/index.js";

/** A recorded call the mock fetch observed. */
export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface MockRoute {
  status?: number;
  /** Response JSON body. */
  json?: unknown;
  /** Response headers. */
  headers?: Record<string, string>;
}

/**
 * Build a fetch double. `routes` maps `"METHOD /path"` (path only, no query) to
 * a canned response. Unmatched routes 404. All calls are recorded.
 */
export function mockFetch(routes: Record<string, MockRoute | MockRoute[]>): {
  fetch: typeof fetch;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const cursors: Record<string, number> = {};
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = (init?.method ?? "GET").toUpperCase();
    const u = new URL(url);
    const key = `${method} ${u.pathname}`;
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    let body: unknown;
    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    calls.push({ url, method, headers, body });

    const route = routes[key];
    const chosen = Array.isArray(route) ? route[Math.min(cursors[key] ?? 0, route.length - 1)] : route;
    if (Array.isArray(route)) cursors[key] = (cursors[key] ?? 0) + 1;

    if (!chosen) {
      return new Response(JSON.stringify({ error: "not found", key }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(chosen.json === undefined ? "" : JSON.stringify(chosen.json), {
      status: chosen.status ?? 200,
      headers: { "content-type": "application/json", ...chosen.headers },
    });
  }) as typeof fetch;

  return { fetch: fetchImpl, calls };
}

/** Timers that never actually sleep — for fast retry tests. */
export const instantTimers: Timers = {
  now: () => 1_700_000_000_000,
  sleep: async () => {},
};

export function goreloConfig(overrides: Partial<ClientConfig> = {}): ClientConfig {
  return {
    provider: "gorelo",
    auth: { kind: "gorelo", apiKey: "test-key" },
    baseUrl: "https://api.usw.gorelo.io",
    timers: instantTimers,
    ...overrides,
  };
}

export function haloConfig(overrides: Partial<ClientConfig> = {}): ClientConfig {
  return {
    provider: "halo",
    auth: {
      kind: "halo",
      authUrl: "https://acme.halopsa.com/auth",
      clientId: "id",
      clientSecret: "secret",
    },
    baseUrl: "https://acme.halopsa.com/api",
    timers: instantTimers,
    ...overrides,
  };
}
