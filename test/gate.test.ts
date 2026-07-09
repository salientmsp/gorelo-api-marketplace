import { describe, expect, it } from "vitest";
import {
  CapabilityUnsupportedError,
  HaloClient,
  isSupported,
  manifestEntries,
  manifestImplementationDrift,
} from "../src/index.js";
import type { OperationKey } from "../src/index.js";
import { goreloConfig, mockFetch } from "./helpers.js";

/**
 * Every Gorelo endpoint stubbed to succeed, so supported ops complete and only
 * genuinely-unsupported ops can throw CapabilityUnsupportedError.
 */
const OK_ROUTES = {
  "POST /v1/tickets": { json: { ticketId: "uuid-1" } },
  "GET /v1/clients": { json: [] },
  "GET /v1/clients/1": { json: { id: 1, name: "Acme" } },
  "POST /v1/clients": { json: { id: 2, name: "New" } },
  "PATCH /v1/clients": { json: { id: 1, name: "Upd" } },
  "GET /v1/clients/1/locations": { json: [] },
  "GET /v1/contacts": { json: [] },
  "GET /v1/contacts/1": { json: { id: 1 } },
  "POST /v1/contacts": { json: { id: 3 } },
  "PATCH /v1/contacts": { json: { id: 1 } },
  "GET /v1/assets/agents": { json: [] },
  "GET /v1/assets/agents/uuid": { json: { id: "uuid" } },
  "GET /v1/tickets/statuses": { json: [] },
  "GET /v1/tickets/types": { json: [] },
  "GET /v1/tickets/tags": { json: [] },
  "GET /v1/organization/groups": { json: [] },
  "GET /v1/organization/users": { json: [] },
  "POST /v1/alerts/": { json: {} },
};

/** Invoke each operation on the client. Inputs are valid for supported ops. */
function invoke(c: HaloClient, key: OperationKey): Promise<unknown> {
  const table: Partial<Record<OperationKey, () => Promise<unknown>>> = {
    "tickets.list": () => c.tickets.list(),
    "tickets.get": () => c.tickets.get("uuid-1"),
    "tickets.create": () => c.tickets.create({ summary: "s" }),
    "tickets.update": () => c.tickets.update({ id: "uuid-1" }),
    "tickets.delete": () => c.tickets.delete("uuid-1"),
    "actions.list": () => c.actions.list(),
    "actions.create": () => c.actions.create({}),
    "clients.list": () => c.clients.list(),
    "clients.get": () => c.clients.get(1),
    "clients.create": () => c.clients.create({ name: "n" }),
    "clients.update": () => c.clients.update({ id: 1 }),
    "clients.delete": () => c.clients.delete(1),
    "sites.list": () => c.sites.list({ client_id: 1 }),
    "sites.get": () => c.sites.get(1),
    "sites.create": () => c.sites.create({ name: "n", client_id: 1 }),
    "sites.update": () => c.sites.update({ id: 1 }),
    "sites.delete": () => c.sites.delete(1),
    "users.list": () => c.users.list(),
    "users.get": () => c.users.get(1),
    "users.create": () => c.users.create({ client_id: 1 }),
    "users.update": () => c.users.update({ id: 1, client_id: 1 }),
    "users.delete": () => c.users.delete(1),
    "assets.list": () => c.assets.list(),
    "assets.get": () => c.assets.get("uuid"),
    "assets.create": () => c.assets.create({}),
    "assets.update": () => c.assets.update({ id: "uuid" }),
    "assets.delete": () => c.assets.delete("uuid"),
    "ticketStatuses.list": () => c.ticketStatuses.list(),
    "ticketTypes.list": () => c.ticketTypes.list(),
    "ticketTags.list": () => c.ticketTags.list(),
    "teams.list": () => c.teams.list(),
    "agents.list": () => c.agents.list(),
    "invoices.list": () => c.invoices.list(),
    "invoices.get": () => c.invoices.get(1),
    "contracts.list": () => c.contracts.list(),
    "alerts.create": () => c.alerts.create({ name: "n", client_id: 1, severity: 1 }),
  };
  const thunk = table[key];
  if (!thunk) throw new Error(`No invocation wired for ${key} — update the gate test table`);
  return thunk();
}

describe("anti-drift gate: manifest ⇔ implementation", () => {
  it("GoreloBackend's implemented ops exactly match the manifest's supported ops", () => {
    const drift = manifestImplementationDrift();
    expect(drift.implementedButNotSupported, "implemented but not marked supported").toEqual([]);
    expect(drift.supportedButNotImplemented, "marked supported but not implemented").toEqual([]);
  });

  it("every supported op runs without a CapabilityUnsupportedError", async () => {
    const { fetch } = mockFetch(OK_ROUTES);
    const c = new HaloClient(goreloConfig({ fetch }));
    for (const e of manifestEntries) {
      if (!isSupported(e.status)) continue;
      const key = `${e.resource}.${e.operation}` as OperationKey;
      await expect(invoke(c, key), `${key} should be servable`).resolves.not.toThrow();
    }
  });

  it("every missing/planned op throws CapabilityUnsupportedError (throw mode)", async () => {
    const { fetch } = mockFetch(OK_ROUTES);
    const c = new HaloClient(goreloConfig({ fetch, mode: "throw" }));
    for (const e of manifestEntries) {
      if (isSupported(e.status)) continue;
      const key = `${e.resource}.${e.operation}` as OperationKey;
      await expect(invoke(c, key), `${key} should be a declared gap`).rejects.toBeInstanceOf(
        CapabilityUnsupportedError,
      );
    }
  });

  it("the thrown gap error carries the manifest entry", async () => {
    const c = new HaloClient(goreloConfig({ fetch: mockFetch(OK_ROUTES).fetch }));
    try {
      await c.tickets.list();
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CapabilityUnsupportedError);
      const e = err as CapabilityUnsupportedError;
      expect(e.manifest.resource).toBe("tickets");
      expect(e.manifest.operation).toBe("list");
      expect(e.manifest.status).toBe("missing");
      expect(e.code).toBe("CAPABILITY_UNSUPPORTED");
      expect(e.provider).toBe("gorelo");
    }
  });
});
