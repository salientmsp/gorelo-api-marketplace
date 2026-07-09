# halo-gorelo-adapter

> Working name: `@salient/halo-gorelo-adapter` (rename before publish).

A TypeScript package that exposes a **Halo PSA–shaped API surface** and, behind a
swappable provider, **translates those calls to the Gorelo API**. Products already
wired to Halo can repoint to Gorelo by changing one config field. Where Gorelo
can't do something, the adapter fails **loudly, predictably, and
self-documenting** — every gap points back to a capability-matrix entry.

Gorelo's API is far smaller than Halo's and ships weekly, so coverage is a living,
versioned thing: a **typed capability manifest** is the single source of truth,
and the human/machine feature matrices are generated from it.

## Install

```sh
npm install @salient/halo-gorelo-adapter
```

Requires Node 18+ (uses global `fetch`; no heavy SDK dependencies).

## Quick start

```ts
import { HaloClient, CapabilityUnsupportedError } from "@salient/halo-gorelo-adapter";

// Point at Gorelo...
const client = new HaloClient({
  provider: "gorelo",
  auth: { kind: "gorelo", apiKey: process.env.GORELO_API_KEY! },
  baseUrl: "https://api.usw.gorelo.io", // region-scoped
});

// ...but call it with Halo shapes.
const created = await client.tickets.create({
  summary: "Printer down",
  client_id: 10,
  site_id: 20,
  tickettype_id: 2,
  priority_id: 3,
  source: "email",
});
console.log(created.id); // a uuid string on Gorelo, not an int — see the matrix

const clients = await client.clients.list({ page_size: 50 });
console.log(clients.record_count, clients.clients);
```

## Switching providers

The only change to target Halo instead of Gorelo is the config. The surface,
types, and pagination envelope are identical.

```ts
const client = new HaloClient({
  provider: "halo",
  auth: {
    kind: "halo",
    authUrl: "https://acme.halopsa.com/auth", // OAuth2 client-credentials
    clientId: process.env.HALO_CLIENT_ID!,
    clientSecret: process.env.HALO_CLIENT_SECRET!,
    scope: "all",
  },
  baseUrl: "https://acme.halopsa.com/api",
});
```

`HaloBackend` is a faithful passthrough (the reference oracle that proves the
contract). Every operation is `full` on Halo.

## Handling gaps

By default, unsupported operations throw `CapabilityUnsupportedError`, which
carries the manifest entry so you get an actionable signal:

```ts
try {
  await client.tickets.list(); // no Gorelo list endpoint
} catch (err) {
  if (err instanceof CapabilityUnsupportedError) {
    console.error(err.manifest.status);   // "missing"
    console.error(err.manifest.goreloRef); // null
    console.error(err.manifest.caveats);   // why, and what to do instead
  }
}
```

Set `mode: "degrade"` to return best-effort empty results (with a logged
warning) instead — but only where an empty result is honest. Unsupported **list**
ops return an empty envelope and **delete** ops become no-ops; unsupported
`get`/`create`/`update` still throw, because there is no honest empty value to
return (the adapter never invents data).

Ask before you call, without try/catch:

```ts
if (client.can("tickets", "update")) { /* ... */ }
const cap = client.capability("tickets", "create"); // full ManifestEntry
```

## Error model

All errors extend `HaloAdapterError` (`code`, `httpStatus`, `provider`,
`resource`, `operation`):

- `CapabilityUnsupportedError` — carries the manifest entry for the gap.
- `AuthError` · `RateLimitError` (with `retryAfterSeconds`) · `NotFoundError` ·
  `ValidationError` (with field `details`).

Transient failures (429 / 5xx / network) are retried with exponential backoff
(honoring `Retry-After`); 4xx are not.

## How to read the matrix

Coverage is generated from the manifest into two files:

- **[`FEATURE-MATRIX.md`](FEATURE-MATRIX.md)** — human-readable: Resource ·
  Operation · Status · Gorelo endpoint · Unsupported params · Caveats, plus
  per-operation field maps.
- **[`feature-matrix.json`](feature-matrix.json)** — the same data, machine-readable.

Statuses: `✅ full` (clean 1:1) · `🟡 partial` (works with field loss / caveats) ·
`❌ missing` (no Gorelo endpoint) · `🔵 planned`.

These are **derived artifacts — never hand-edit them.** Regenerate with
`npm run matrix`.

## Architecture

Five layers, one source of truth:

1. **Public surface — `HaloClient`** — Halo-shaped resource namespaces
   (`client.tickets`, `client.clients`, …). This is the semver-governed contract.
2. **Provider interface — `Backend`** — every operation is a method a provider
   implements. `HaloBackend` (passthrough) and `GoreloBackend` (translating).
3. **Capability manifest** ([`src/manifest/manifest.ts`](src/manifest/manifest.ts))
   — the typed, tested single source of truth keyed by `(resource, operation)`:
   `status`, `fieldMap`, `unsupportedParams`, `caveats`, `goreloRef`.
4. **Matrix generator** ([`scripts/generate-matrix.ts`](scripts/generate-matrix.ts))
   — emits the two matrix files.
5. **Cross-cutting** — auth (Halo OAuth2 token cache/refresh; Gorelo `X-API-Key`),
   pagination normalization, retry/backoff, structured secret-redacting logging,
   unified errors.

**Anti-drift gate.** `GoreloBackend` declares the operations it actually
translates (`IMPLEMENTED`); `npm run matrix:check` (run in CI) fails the build if
that set disagrees with the manifest's `full`/`partial` set, or if the generated
files are stale. The test suite additionally proves every supported op runs and
every gap throws/degrades as declared. The manifest and the code cannot disagree
and still pass.

Adding Gorelo coverage = edit one manifest entry + one translator + one test,
then `npm run matrix`. That's the whole maintainability story for a target that
moves weekly.

## Development

```sh
npm install
npm run typecheck   # tsc --noEmit
npm run test        # vitest
npm run matrix      # regenerate FEATURE-MATRIX.md + feature-matrix.json
npm run matrix:check# CI anti-drift gate
npm run build       # ESM + CJS + d.ts via tsup
npm run ci          # typecheck + test + matrix:check
```

### Discovery inputs

- [`spec/gorelo-public-api.v1.json`](spec/gorelo-public-api.v1.json) — vendored
  Gorelo OpenAPI spec (source of truth; re-fetch weekly and diff).
- [`docs/gorelo-surface.json`](docs/gorelo-surface.json) — condensed Gorelo
  operation inventory derived from the spec.
- [`docs/halo-surface.json`](docs/halo-surface.json) — **seed** of the modeled
  Halo surface. A full ingestion (per-tenant `/apidoc` + `homotechsual/HaloAPI`
  cmdlets, flagging undocumented endpoints) is pending live access.
- [`docs/gorelo-halo-feature-matrix.md`](docs/gorelo-halo-feature-matrix.md) —
  the original hand-written mapping the manifest was seeded from.

## Status & limitations

- **Tickets are write-only on Gorelo** — create only; no list/get/update/delete.
- **No finance surface** — invoices/contracts/etc. are all `missing`.
- **Mixed ID types** — clients/contacts/locations are int64; tickets/assets are
  uuid, carried as opaque strings on the Halo shape.
- **Priority/source/severity enum maps are documented defaults** — Gorelo
  publishes only numeric ranges, not names. Override at the call site if a
  tenant's Halo scheme differs.
- **`organization/users` / `organization/groups`** publish no response schema;
  `teams`/`agents` pass through loosely-typed until a live tenant is probed.
- **`HaloBackend`** is implemented against Halo's documented conventions but has
  not yet been run against a live tenant; contract tests use fixtures.
