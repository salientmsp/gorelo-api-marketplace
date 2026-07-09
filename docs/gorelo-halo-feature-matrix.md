# Gorelo ↔ Halo Feature Matrix (seed)

Seed for the capability manifest that lets Halo-integrated apps talk to Gorelo.
It maps every Halo PSA operation an integration might call onto the Gorelo
Public API surface, records how faithfully each one can be served, and flags the
gaps that any consuming code must handle explicitly.

**This is a seed, not the source of truth.** Once code exists, the manifest is
generated from the vendored spec and supersedes this file. Keep this file honest
in the meantime: Gorelo ships weekly, so re-fetch the spec, diff, and update.

## Provenance

- **Spec:** Gorelo Public API v1 (`Public API`, OpenAPI 3.0.1), vendored at
  [`spec/gorelo-public-api.v1.json`](../spec/gorelo-public-api.v1.json).
- **Source:** `https://api.usw.gorelo.io/swagger/v1/swagger.json`.
- **Verified:** 2026-07-09. Every status, field list, and ID type below was
  checked against the vendored spec, not transcribed from memory. When you
  re-fetch, re-run that check and bump this date.

**Status legend:** `full` = clean 1:1 · `partial` = works with caveats / field
loss · `missing` = no Gorelo endpoint · `gorelo-only` = exists in Gorelo, no
Halo contract slot.

## Gorelo surface, in full

This is the **entire** public API — 14 paths. Anything not on this list is
`missing` by definition.

- **Auth:** `X-API-Key` request header (`ApiKeyAuth`).
- **Base:** `https://api.<region>.gorelo.io` — region-scoped; `usw` observed.
  The spec publishes no `servers` block, so the region is caller-supplied.
- **Contacts:** `GET /v1/contacts` (query: `ContactIds`, `clientid`) ·
  `POST /v1/contacts` · `PATCH /v1/contacts` · `GET /v1/contacts/{id}` (int64)
- **Clients:** `GET /v1/clients` · `POST /v1/clients` · `PATCH /v1/clients` ·
  `GET /v1/clients/{id}` (int64) · `GET /v1/clients/{clientId}/locations`
- **Assets:** `GET /v1/assets/agents` · `GET /v1/assets/agents/{id}` (uuid)
- **Alerts:** `POST /v1/alerts/`
- **Tickets:** `POST /v1/tickets` · `GET /v1/tickets/statuses` ·
  `GET /v1/tickets/tags` · `GET /v1/tickets/types`
- **Organization:** `GET /v1/organization/users` ·
  `GET /v1/organization/groups` — both return **200 with no response schema**.

## Tickets — Halo `/Tickets`, `/Actions`

| Halo operation | Status | Gorelo | Notes |
|---|---|---|---|
| List `GET /Tickets` | **missing** | — | No list endpoint. Blocks any sync/read integration. |
| Get `GET /Tickets/{id}` | **missing** | — | No read-by-id. Cannot round-trip a created ticket. |
| Create `POST /Tickets` | **partial** | `POST /v1/tickets` | Result is `{ ticketId }` where `ticketId` is a **uuid**, not an int. Requires resolving `statusId`/`typeId` via Gorelo lookups and mapping `priorityId` (0–4) / `sourceId` (1–6) enums. Many Halo fields unsupported (below). |
| Update `POST /Tickets` (id in body) | **missing** | — | No update/patch path. |
| Delete `DELETE /Tickets/{id}` | **missing** | — | |
| Actions / comments / replies `/Actions` | **missing** | — | No public conversation endpoint. |
| Attachments `/Attachment` | **missing** | — | |
| Time entries / worklog | **missing** | — | |

**Create-ticket field support** — `CreatePublicTicketCommand`, verified field
list: `title`, `description`, `createdByName`, `clientId`, `locationId`,
`contactId`, `ccContactIds[]`, `statusId`, `groupId`, `priorityId` (enum),
`sourceId` (enum), `typeId`, `leadAssigneeId`, `assistingAssigneeIds[]`,
`watcherIds[]`, `tagIds[]`, `agentAssetIds[]` (uuid), `customAssetIds[]` (uuid),
`uptimeIds[]` (uuid), `sendTicketCreatedEmail`, `isUnread`. No custom fields, no
SLA, no category tree beyond type/tag.

## Ticket lookups

| Halo | Status | Gorelo | Notes |
|---|---|---|---|
| Statuses | **full** | `GET /v1/tickets/statuses` | `PublicStatusListItemModel`: `id`, `name`, `baseStatusId`, `color`, `sortOrder`, `askForReason`, `description`. |
| Types | **full** | `GET /v1/tickets/types` | `PublicTypeListItemModel`: `id`, `name`, `isAiType`, `description`. |
| Tags | **full** | `GET /v1/tickets/tags` | `PublicTagListItemModel`: `id`, `name`, `isAiTag`, `description`. |
| Priorities | **partial** | inline enum | No endpoint. Hardcode `PublicTicketPriority` 0–4 → Halo priority IDs. |
| Sources | **partial** | inline enum | No endpoint. Hardcode `TicketSource` 1–6. |

## Clients — Halo `/Client`

| Halo operation | Status | Gorelo | Notes |
|---|---|---|---|
| List `GET /Client` | **partial** | `GET /v1/clients` | Bare array of `PublicClientResponse`, **no pagination or filters**. Synthesize Halo's `record_count` / `page_*` envelope client-side. |
| Get `GET /Client/{id}` | **full** | `GET /v1/clients/{id}` | int64 id. Response includes `domains[]`, `isDefault`, `statusId`. |
| Create `POST /Client` | **partial** | `POST /v1/clients` | `CreatePublicClientCommand` accepts only `name`, `billingName`, `alternateName`, `domain`, and one nested `location`. |
| Update `POST /Client` | **partial** | `PATCH /v1/clients` | `UpdatePublicClientCommand` accepts only `id`, `name`, `statusId`, `billingName`, `alternateName`. |
| Delete | **missing** | — | |

## Sites — Halo `/Site` ↔ Gorelo client locations

| Halo operation | Status | Gorelo | Notes |
|---|---|---|---|
| List by client | **partial** | `GET /v1/clients/{clientId}/locations` | Scoped to one client only — no global site list. |
| List all `GET /Site` | **missing** | — | Must iterate clients to assemble. |
| Get `GET /Site/{id}` | **missing** | — | No `/locations/{id}`. |
| Create | **partial** | — | Only as the nested `location` on client-create; no standalone create. |
| Update / Delete | **missing** | — | |

`PublicClientLocationResponse` is rich on read: `address1/2`, `city`, `state`,
`country`, `postalCode`, `geoLocationLatitude`/`Longitude`, `timeZone`, `phone`
(+ `phoneCountryCode`, `phoneExt`), `primaryContactId`, `isDefault`,
`isDefaultBilling`.

## Contacts — Halo `/Users` ↔ Gorelo contacts

| Halo operation | Status | Gorelo | Notes |
|---|---|---|---|
| List `GET /Users` | **partial** | `GET /v1/contacts` | Filters only by `ContactIds` and `clientid`. No search/paging — most Halo filter params become `unsupportedParams`. Bare array of `PublicContactResponse`. |
| Get `GET /Users/{id}` | **full** | `GET /v1/contacts/{id}` | int64 id. |
| Create `POST /Users` | **partial** | `POST /v1/contacts` | Maps `firstName`/`lastName`, `primaryEmail`, `secondaryEmail[]`, `mobilePhone`/`officePhone` (+ country codes), `jobTitle`, `department`, `timeZone`, `clientLocationId`. |
| Update `POST /Users` | **partial** | `PATCH /v1/contacts` | Same field set, keyed on `contactId` in body. |
| Delete | **missing** | — | |

**Semantic note:** Halo splits **Users** (client-side contacts) from **Agents**
(staff). Gorelo **Contacts** = Halo Users; Gorelo **Organization/users** = Halo
Agents. Halo `Users.site_id` ↔ Gorelo `clientLocationId`.

## Agents & Teams — Halo `/Agent`, `/Team`

| Halo | Status | Gorelo | Notes |
|---|---|---|---|
| Agents list `GET /Agent` | **partial** | `GET /v1/organization/users` | **No response schema published** (200, empty content) — probe a live tenant to model it before promoting to `full`. |
| Agent get | **missing** | — | |
| Teams list `GET /Team` | **partial** | `GET /v1/organization/groups` | Undocumented schema; also the source for ticket `groupId`. |

## Assets / CMDB — Halo `/Asset`

| Halo operation | Status | Gorelo | Notes |
|---|---|---|---|
| List `GET /Asset` | **partial** | `GET /v1/assets/agents` | **RMM agents only.** `PublicDeviceResponse` is a rich device model (OS, hardware, IPs, warranty, boot time). No custom/non-agent assets. |
| Get `GET /Asset/{id}` | **partial** | `GET /v1/assets/agents/{id}` | **uuid** key, not int. |
| Create / Update / Delete | **missing** | — | Asset write is not exposed. |
| Custom assets | **missing** | — | Referenced by ticket-create (`customAssetIds`, `uptimeIds`) but no CRUD to manage them. |

## No Gorelo counterpart (all `missing`)

Invoices · Recurring Invoices · Contracts · Quotations · Purchase Orders ·
Items & Stock · Suppliers · Supplier Contracts · Projects ·
Appointments/Calendar · Knowledge Base · SLAs · Reports ·
Webhooks/Notifications management · Custom Objects · Custom Fields. This is the
bulk of Halo's finance and workflow surface.

## Gorelo-only (no Halo contract slot)

| Gorelo | Notes |
|---|---|
| `POST /v1/alerts/` | Inbound RMM alert creation. `PostAlertCommand`: `name`, `clientId`, `resource`, `severity` (`AlertLevel` 1–4), `description`, `type`. No Halo public "create alert" analog — expose as a library extension rather than forcing it into the Halo shape. |

## Design implications (carry into the manifest)

1. **Ticket round-tripping is impossible** on Gorelo today (write-only). Any
   product that reads or updates tickets should get `CapabilityUnsupportedError`
   early, pointing here — don't fake it.
2. **Synthesize Halo's pagination envelope** everywhere. Every list is a bare
   array; document that paging is client-side and filters are near-absent.
3. **ID-type bridge is mandatory:** int64 (clients, contacts, locations) vs uuid
   (tickets, assets). Decide how the Halo-int-shaped contract represents
   uuid-keyed resources — opaque string passthrough vs a mapping table.
4. **Enum maps** for priority / source / alert-severity live in code with tests,
   since Gorelo publishes no lookup endpoints for them.
5. **Two undocumented endpoints** (`organization/users`, `organization/groups`)
   need live probing to model before they can be `full`.

## Keeping this current

```
# refetch, pretty-print, diff against the vendored copy
curl -s https://api.usw.gorelo.io/swagger/v1/swagger.json \
  | python3 -m json.tool > /tmp/gorelo.v1.json
diff spec/gorelo-public-api.v1.json /tmp/gorelo.v1.json
```

Any diff = update the vendored spec, re-verify the rows above, and bump the
**Verified** date in Provenance.
