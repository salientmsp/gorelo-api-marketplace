import { describe, expect, it } from "vitest";
import {
  AuthError,
  HaloClient,
  NotFoundError,
  RateLimitError,
  ValidationError,
  coverageSummary,
  manifestEntries,
} from "../src/index.js";
import { toGoreloAlertLevel, toGoreloPriority, toGoreloSource } from "../src/backends/gorelo/enums.js";
import { toHaloPage } from "../src/pagination.js";
import { goreloConfig, mockFetch } from "./helpers.js";

describe("enum maps", () => {
  it("clamps priority into the Gorelo 0-4 range", () => {
    expect(toGoreloPriority(2)).toBe(2);
    expect(toGoreloPriority(9)).toBe(4);
    expect(toGoreloPriority(-1)).toBe(0);
    expect(toGoreloPriority(undefined)).toBeUndefined();
  });

  it("maps known source names and clamps numeric sources", () => {
    expect(toGoreloSource("email")).toBe(1);
    expect(toGoreloSource("Portal")).toBe(3);
    expect(toGoreloSource(5)).toBe(5);
    expect(toGoreloSource(99)).toBe(6);
    expect(() => toGoreloSource("nope")).toThrow(ValidationError);
  });

  it("clamps alert severity into 1-4", () => {
    expect(toGoreloAlertLevel(1)).toBe(1);
    expect(toGoreloAlertLevel(0)).toBe(1);
    expect(toGoreloAlertLevel(7)).toBe(4);
  });
});

describe("pagination synthesis", () => {
  it("wraps a full array with record_count", () => {
    const page = toHaloPage("clients", [{ id: 1 }, { id: 2 }]);
    expect(page.record_count).toBe(2);
    expect(page.clients).toHaveLength(2);
  });

  it("applies a client-side window but reports the true total", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    const page = toHaloPage("clients", items, { page_no: 3, page_size: 3 });
    expect(page.record_count).toBe(10);
    expect((page.clients as Array<{ id: number }>).map((x) => x.id)).toEqual([6, 7, 8]);
  });
});

describe("http retry + error mapping", () => {
  it("retries a 429 then succeeds, honoring Retry-After", async () => {
    const { fetch, calls } = mockFetch({
      "GET /v1/clients": [
        { status: 429, headers: { "retry-after": "0" }, json: { error: "slow down" } },
        { status: 200, json: [{ id: 1 }] },
      ],
    });
    const c = new HaloClient(goreloConfig({ fetch }));
    const res = await c.clients.list();
    expect(res.record_count).toBe(1);
    expect(calls.filter((x) => x.url.includes("/v1/clients"))).toHaveLength(2);
  });

  it("surfaces a persistent 429 as RateLimitError", async () => {
    const { fetch } = mockFetch({
      "GET /v1/clients": { status: 429, json: { error: "nope" } },
    });
    const c = new HaloClient(goreloConfig({ fetch, retry: { maxAttempts: 2 } }));
    await expect(c.clients.list()).rejects.toBeInstanceOf(RateLimitError);
  });

  it("maps 401 → AuthError and 404 → NotFoundError", async () => {
    const authClient = new HaloClient(
      goreloConfig({ fetch: mockFetch({ "GET /v1/clients": { status: 401, json: {} } }).fetch }),
    );
    await expect(authClient.clients.list()).rejects.toBeInstanceOf(AuthError);

    const nfClient = new HaloClient(
      goreloConfig({ fetch: mockFetch({ "GET /v1/clients/1": { status: 404, json: {} } }).fetch }),
    );
    await expect(nfClient.clients.get(1)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("does not retry a 404", async () => {
    const { fetch, calls } = mockFetch({ "GET /v1/clients/1": { status: 404, json: {} } });
    const c = new HaloClient(goreloConfig({ fetch }));
    await expect(c.clients.get(1)).rejects.toBeInstanceOf(NotFoundError);
    expect(calls).toHaveLength(1);
  });
});

describe("coverage summary", () => {
  it("counts to the full operation set", () => {
    const cov = coverageSummary();
    expect(cov.total).toBe(manifestEntries.length);
    expect(cov.supported).toBe(cov.byStatus.full + cov.byStatus.partial);
    expect(cov.total).toBe(
      cov.byStatus.full + cov.byStatus.partial + cov.byStatus.missing + cov.byStatus.planned,
    );
  });
});

describe("config validation", () => {
  it("rejects a mismatched provider/auth pair", () => {
    expect(
      () =>
        new HaloClient({
          provider: "gorelo",
          auth: { kind: "halo", authUrl: "x", clientId: "a", clientSecret: "b" },
          baseUrl: "https://api.usw.gorelo.io",
          fetch: mockFetch({}).fetch,
        }),
    ).toThrow(ValidationError);
  });

  it("requires a baseUrl", () => {
    expect(
      () =>
        new HaloClient({
          provider: "gorelo",
          auth: { kind: "gorelo", apiKey: "k" },
          baseUrl: "",
          fetch: mockFetch({}).fetch,
        }),
    ).toThrow(ValidationError);
  });
});
