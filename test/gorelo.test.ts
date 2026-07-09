import { describe, expect, it } from "vitest";
import { CapabilityUnsupportedError, HaloClient, ValidationError } from "../src/index.js";
import { goreloConfig, mockFetch } from "./helpers.js";

describe("GoreloBackend translations", () => {
  it("creates a ticket, mapping Halo fields → Gorelo and carrying the uuid id back", async () => {
    const { fetch, calls } = mockFetch({ "POST /v1/tickets": { json: { ticketId: "0f9-uuid" } } });
    const c = new HaloClient(goreloConfig({ fetch }));

    const ticket = await c.tickets.create({
      summary: "Printer down",
      details: "It's on fire",
      client_id: 10,
      site_id: 20,
      user_id: 30,
      tickettype_id: 2,
      priority_id: 3,
      source: "email",
    });

    // Request was translated to Gorelo shape.
    expect(calls[0]?.body).toMatchObject({
      title: "Printer down",
      description: "It's on fire",
      clientId: 10,
      locationId: 20,
      contactId: 30,
      typeId: 2,
      priorityId: 3,
      sourceId: 1, // email → 1
    });
    // uuid id is carried through, not faked as an int.
    expect(ticket.id).toBe("0f9-uuid");
    expect(typeof ticket.id).toBe("string");
    expect(ticket.summary).toBe("Printer down");
  });

  it("sends the X-API-Key auth header", async () => {
    const { fetch, calls } = mockFetch({ "GET /v1/clients": { json: [] } });
    const c = new HaloClient(goreloConfig({ fetch, auth: { kind: "gorelo", apiKey: "secret-123" } }));
    await c.clients.list();
    expect(calls[0]?.headers["x-api-key"]).toBe("secret-123");
  });

  it("synthesizes Halo's pagination envelope over a bare Gorelo array", async () => {
    const { fetch } = mockFetch({
      "GET /v1/clients": {
        json: [
          { id: 1, name: "A" },
          { id: 2, name: "B" },
          { id: 3, name: "C" },
        ],
      },
    });
    const c = new HaloClient(goreloConfig({ fetch }));

    const all = await c.clients.list();
    expect(all.record_count).toBe(3);
    expect((all.clients as unknown[]).length).toBe(3);

    // Client-side paging window.
    const page2 = await c.clients.list({ page_no: 2, page_size: 2 });
    expect(page2.record_count).toBe(3); // total, not page size
    expect((page2.clients as Array<{ id: number }>).map((x) => x.id)).toEqual([3]);
  });

  it("maps client status to Halo fields on get", async () => {
    const { fetch } = mockFetch({
      "GET /v1/clients/7": { json: { id: 7, name: "Acme", billingName: "Acme LLC", statusId: 1, domains: ["acme.com"] } },
    });
    const c = new HaloClient(goreloConfig({ fetch }));
    const client = await c.clients.get(7);
    expect(client).toMatchObject({ id: 7, name: "Acme", billing_name: "Acme LLC", inactive: false });
    expect(client.domains).toEqual(["acme.com"]);
  });

  it("filters contacts by client_id and ids via Gorelo query params", async () => {
    const { fetch, calls } = mockFetch({ "GET /v1/contacts": { json: [{ id: 1, firstName: "Ann" }] } });
    const c = new HaloClient(goreloConfig({ fetch }));
    const res = await c.users.list({ client_id: 5, ids: [1, 2] });
    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get("clientid")).toBe("5");
    expect(url.searchParams.get("ContactIds")).toBe("1,2");
    expect((res.users as Array<{ firstname: string }>)[0]?.firstname).toBe("Ann");
  });

  it("requires client_id for sites.list (no global location list)", async () => {
    const { fetch } = mockFetch({});
    const c = new HaloClient(goreloConfig({ fetch }));
    await expect(c.sites.list()).rejects.toBeInstanceOf(ValidationError);
  });

  it("carries asset uuid ids through as opaque strings", async () => {
    const { fetch } = mockFetch({
      "GET /v1/assets/agents": { json: [{ id: "abc-uuid", name: "LT-01", clientId: 4 }] },
    });
    const c = new HaloClient(goreloConfig({ fetch }));
    const res = await c.assets.list();
    const first = (res.assets as Array<{ id: string; inventory_number: string }>)[0];
    expect(first?.id).toBe("abc-uuid");
    expect(first?.inventory_number).toBe("LT-01");
  });

  it("posts a Gorelo-only alert with the severity enum", async () => {
    const { fetch, calls } = mockFetch({ "POST /v1/alerts/": { json: {} } });
    const c = new HaloClient(goreloConfig({ fetch }));
    const res = await c.alerts.create({ name: "CPU high", client_id: 9, severity: 3, resource: "srv-1" });
    expect(res.ok).toBe(true);
    expect(calls[0]?.body).toMatchObject({ name: "CPU high", clientId: 9, severity: 3, resource: "srv-1" });
  });

  it("rejects an unknown ticket source rather than guessing", async () => {
    const { fetch } = mockFetch({ "POST /v1/tickets": { json: { ticketId: "x" } } });
    const c = new HaloClient(goreloConfig({ fetch }));
    await expect(c.tickets.create({ summary: "s", source: "carrier-pigeon" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("GoreloBackend gap behavior", () => {
  it("throws by default on an unsupported op", async () => {
    const c = new HaloClient(goreloConfig({ fetch: mockFetch({}).fetch }));
    await expect(c.invoices.list()).rejects.toBeInstanceOf(CapabilityUnsupportedError);
  });

  it("degrades unsupported list ops to an empty envelope with mode: degrade", async () => {
    const warnings: string[] = [];
    const logger = {
      debug() {},
      info() {},
      warn: (m: string) => warnings.push(m),
      error() {},
    };
    const c = new HaloClient(goreloConfig({ fetch: mockFetch({}).fetch, mode: "degrade", logger }));
    const res = await c.invoices.list();
    expect(res.record_count).toBe(0);
    expect(res.invoices).toEqual([]);
    expect(warnings).toContain("capability.degrade");
  });

  it("degrades unsupported delete ops to a no-op with mode: degrade", async () => {
    const c = new HaloClient(goreloConfig({ fetch: mockFetch({}).fetch, mode: "degrade" }));
    await expect(c.tickets.delete("x")).resolves.toBeUndefined();
  });

  it("still throws on unsupported non-list ops even in degrade mode", async () => {
    const c = new HaloClient(goreloConfig({ fetch: mockFetch({}).fetch, mode: "degrade" }));
    await expect(c.tickets.get("x")).rejects.toBeInstanceOf(CapabilityUnsupportedError);
  });
});
