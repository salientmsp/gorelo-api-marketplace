import { describe, expect, it } from "vitest";
import { HaloAdapterError, HaloClient } from "../src/index.js";
import { haloConfig, mockFetch } from "./helpers.js";

/**
 * Contract tests: the public surface round-trips Halo faithfully. HaloBackend is
 * the reference oracle — these lock the contract before any Gorelo work.
 */
describe("HaloBackend passthrough contract", () => {
  const TOKEN_ROUTE = { "POST /auth/token": { json: { access_token: "tok", expires_in: 3600 } } };

  it("fetches an OAuth token and sends it as a bearer on resource calls", async () => {
    const { fetch, calls } = mockFetch({
      ...TOKEN_ROUTE,
      "GET /api/Tickets": { json: { record_count: 1, tickets: [{ id: 100, summary: "T" }] } },
    });
    const c = new HaloClient(haloConfig({ fetch }));
    const res = await c.tickets.list();

    // Token request went out form-encoded.
    const tokenCall = calls.find((x) => x.url.endsWith("/auth/token"));
    expect(tokenCall?.method).toBe("POST");
    // Resource call carried the bearer.
    const listCall = calls.find((x) => x.url.endsWith("/api/Tickets"));
    expect(listCall?.headers["authorization"]).toBe("Bearer tok");

    expect(res.record_count).toBe(1);
    expect((res.tickets as Array<{ id: number }>)[0]?.id).toBe(100);
  });

  it("caches the token across calls (one token request for two operations)", async () => {
    const { fetch, calls } = mockFetch({
      ...TOKEN_ROUTE,
      "GET /api/Client": { json: { record_count: 0, clients: [] } },
      "GET /api/Users": { json: { record_count: 0, users: [] } },
    });
    const c = new HaloClient(haloConfig({ fetch }));
    await c.clients.list();
    await c.users.list();
    expect(calls.filter((x) => x.url.endsWith("/auth/token"))).toHaveLength(1);
  });

  it("wraps create bodies in an array (Halo POST convention) and unwraps the result", async () => {
    const { fetch, calls } = mockFetch({
      ...TOKEN_ROUTE,
      "POST /api/Client": { json: [{ id: 55, name: "Made" }] },
    });
    const c = new HaloClient(haloConfig({ fetch }));
    const created = await c.clients.create({ name: "Made" });
    const postCall = calls.find((x) => x.method === "POST" && x.url.endsWith("/api/Client"));
    expect(Array.isArray(postCall?.body)).toBe(true);
    expect(created.id).toBe(55);
  });

  it("reports everything as servable via can()/capability()", () => {
    const c = new HaloClient(haloConfig({ fetch: mockFetch(TOKEN_ROUTE).fetch }));
    expect(c.can("tickets", "list")).toBe(true);
    expect(c.can("invoices", "get")).toBe(true);
    expect(c.capability("tickets", "list")?.status).toBe("full");
  });

  it("rejects the Gorelo-only alerts extension on the Halo backend", async () => {
    const c = new HaloClient(haloConfig({ fetch: mockFetch(TOKEN_ROUTE).fetch }));
    await expect(c.alerts.create({ name: "x", client_id: 1, severity: 1 })).rejects.toBeInstanceOf(
      HaloAdapterError,
    );
  });
});

describe("capability introspection on Gorelo", () => {
  it("reflects the manifest", () => {
    const c = new HaloClient({
      provider: "gorelo",
      auth: { kind: "gorelo", apiKey: "k" },
      baseUrl: "https://api.usw.gorelo.io",
      fetch: mockFetch({}).fetch,
    });
    expect(c.can("tickets", "create")).toBe(true);
    expect(c.can("tickets", "list")).toBe(false);
    expect(c.capability("clients", "get")?.status).toBe("full");
    expect(c.capability("tickets", "create")?.goreloRef).toEqual(["POST /v1/tickets"]);
  });
});
