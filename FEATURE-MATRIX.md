# Gorelo Feature Matrix

> **Generated file — do not edit.** Produced from the typed capability manifest
> (`src/manifest/manifest.ts`) by `scripts/generate-matrix.ts`. Run
> `npm run matrix` to regenerate; `npm run matrix:check` gates CI.

Coverage of the **Gorelo** backend against the Halo-shaped public contract. The
Halo backend is a faithful passthrough (every operation `full`), so only Gorelo
needs a matrix.

## Coverage summary

- **18/36** operations servable (50%)
- ✅ full: 6 · 🟡 partial: 12 · ❌ missing: 18 · 🔵 planned: 0

## Operations

| Resource | Operation | Status | Gorelo endpoint | Unsupported params | Caveats |
|---|---|---|---|---|---|
| `tickets` | `list` | ❌ missing | — | — | Gorelo publishes no ticket list endpoint. Blocks any sync/read integration. |
| `tickets` | `get` | ❌ missing | — | — | No get-by-id. A created ticket cannot be round-tripped. |
| `tickets` | `create` | 🟡 partial | `POST /v1/tickets` | `customfields`, `sla_id`, `category_1`, `category_2`, `assets`, `attachments`, `actions` | Result id is a uuid, not a Halo int64. Callers must treat ticket ids as opaque strings. statusId/typeId must be resolved via the ticket lookup endpoints first. priority and source are inline enums with no lookup endpoint; maps are hardcoded and tested. No custom fields, SLA, or category tree beyond type/tag. |
| `tickets` | `update` | ❌ missing | — | — | No update/patch path for tickets. |
| `tickets` | `delete` | ❌ missing | — | — | No delete path for tickets. |
| `actions` | `list` | ❌ missing | — | — | No public conversation/actions endpoint. |
| `actions` | `create` | ❌ missing | — | — | No public conversation/actions endpoint. |
| `clients` | `list` | 🟡 partial | `GET /v1/clients` | `page_no`, `page_size`, `search`, `order`, `orderdesc` | Bare unpaginated array; Halo's record_count/page_* envelope is synthesized client-side. No server-side search or ordering. |
| `clients` | `get` | ✅ full | `GET /v1/clients/{id}` | — | int64 id. |
| `clients` | `create` | 🟡 partial | `POST /v1/clients` | `notes`, `customfields`, `toplevel_id`, `pricebook_id` | Only name, billingName, alternateName, domain, and one nested location are accepted. |
| `clients` | `update` | 🟡 partial | `PATCH /v1/clients` | `notes`, `customfields`, `website` | Only id, name, statusId, billingName, alternateName are patchable. |
| `clients` | `delete` | ❌ missing | — | — | No client delete path. |
| `sites` | `list` | 🟡 partial | `GET /v1/clients/{clientId}/locations` | `page_no`, `page_size`, `search` | Requires a client_id filter; there is no global site list. Bare unpaginated array; envelope synthesized client-side. |
| `sites` | `get` | ❌ missing | — | — | No /locations/{id} endpoint. Fetch via the client's location list and filter client-side. |
| `sites` | `create` | ❌ missing | — | — | No standalone location create; a location may only be nested on client create. |
| `sites` | `update` | ❌ missing | — | — | No location update path. |
| `sites` | `delete` | ❌ missing | — | — | No location delete path. |
| `users` | `list` | 🟡 partial | `GET /v1/contacts` | `page_no`, `page_size`, `search`, `order` | Filters only by ContactIds and clientid; other Halo filters become unsupportedParams. Bare unpaginated array; envelope synthesized client-side. |
| `users` | `get` | ✅ full | `GET /v1/contacts/{id}` | — | int64 id. |
| `users` | `create` | 🟡 partial | `POST /v1/contacts` | `customfields`, `isimportantcontact`, `login` | clientId is required by Gorelo. |
| `users` | `update` | 🟡 partial | `PATCH /v1/contacts` | `customfields` | Keyed on contactId in the body; clientId is required. |
| `users` | `delete` | ❌ missing | — | — | No contact delete path. |
| `assets` | `list` | 🟡 partial | `GET /v1/assets/agents` | `page_no`, `page_size`, `assettype_id`, `search` | RMM agents only; no custom/non-agent assets. id is a uuid, carried as an opaque string. Bare unpaginated array; envelope synthesized client-side. |
| `assets` | `get` | 🟡 partial | `GET /v1/assets/agents/{id}` | — | uuid key, not int. |
| `assets` | `create` | ❌ missing | — | — | Asset write is not exposed. |
| `assets` | `update` | ❌ missing | — | — | Asset write is not exposed. |
| `assets` | `delete` | ❌ missing | — | — | Asset write is not exposed. |
| `ticketStatuses` | `list` | ✅ full | `GET /v1/tickets/statuses` | — | Includes baseStatusId, color, sortOrder. |
| `ticketTypes` | `list` | ✅ full | `GET /v1/tickets/types` | — | — |
| `ticketTags` | `list` | ✅ full | `GET /v1/tickets/tags` | — | — |
| `teams` | `list` | 🟡 partial | `GET /v1/organization/groups` | — | Response schema is not published by Gorelo; passed through as loosely-typed objects until a live tenant is probed. |
| `agents` | `list` | 🟡 partial | `GET /v1/organization/users` | — | Response schema is not published by Gorelo; passed through as loosely-typed objects until a live tenant is probed. |
| `invoices` | `list` | ❌ missing | — | — | Gorelo has no billing/finance surface. |
| `invoices` | `get` | ❌ missing | — | — | Gorelo has no billing/finance surface. |
| `contracts` | `list` | ❌ missing | — | — | Gorelo has no contracts surface. |
| `alerts` | `create` | ✅ full | `POST /v1/alerts/` | — | Gorelo-only: no Halo public 'create alert' analog. Exposed as a library extension, not part of the Halo contract. |

## Field maps

<details><summary><code>tickets.create</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `summary` | `title` | in | — |
| `details` | `description` | in | — |
| `client_id` | `clientId` | in | — |
| `site_id` | `locationId` | in | — |
| `user_id` | `contactId` | in | — |
| `status_id` | `statusId` | in | — |
| `team_id` | `groupId` | in | — |
| `tickettype_id` | `typeId` | in | — |
| `agent_id` | `leadAssigneeId` | in | — |
| `priority_id` | `priorityId` | in | Halo priority id → Gorelo PublicTicketPriority enum (0-4) |
| `source` | `sourceId` | in | Halo source → Gorelo TicketSource enum (1-6) |
| `id` | `ticketId` | out | Gorelo returns a uuid, not an int; carried as an opaque string id |

</details>

<details><summary><code>clients.list</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `id` | `id` | out | — |
| `name` | `name` | out | — |
| `inactive` | `statusId` | out | statusId → inactive flag (best-effort) |

</details>

<details><summary><code>clients.get</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `id` | `id` | out | — |
| `name` | `name` | out | — |
| `domains` | `domains` | out | — |

</details>

<details><summary><code>clients.create</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `name` | `name` | in | — |
| `billing_name` | `billingName` | in | — |
| `alternate_name` | `alternateName` | in | — |
| `website` | `domain` | in | primary website → domain |

</details>

<details><summary><code>clients.update</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `id` | `id` | in | — |
| `name` | `name` | in | — |
| `inactive` | `statusId` | in | inactive flag → statusId (best-effort) |
| `billing_name` | `billingName` | in | — |
| `alternate_name` | `alternateName` | in | — |

</details>

<details><summary><code>sites.list</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `id` | `id` | out | — |
| `name` | `name` | out | — |
| `client_id` | `clientId` | out | — |
| `phonenumber` | `phone` | out | — |

</details>

<details><summary><code>users.list</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `id` | `id` | out | — |
| `firstname` | `firstName` | out | — |
| `surname` | `lastName` | out | — |
| `emailaddress` | `primaryEmail` | out | — |
| `client_id` | `clientId` | both | — |
| `site_id` | `clientLocationId` | out | — |

</details>

<details><summary><code>users.get</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `id` | `id` | out | — |
| `firstname` | `firstName` | out | — |
| `surname` | `lastName` | out | — |
| `emailaddress` | `primaryEmail` | out | — |

</details>

<details><summary><code>users.create</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `firstname` | `firstName` | in | — |
| `surname` | `lastName` | in | — |
| `client_id` | `clientId` | in | — |
| `site_id` | `clientLocationId` | in | — |
| `emailaddress` | `primaryEmail` | in | — |
| `phonenumber` | `officePhone` | in | — |
| `mobilenumber` | `mobilePhone` | in | — |
| `jobtitle` | `jobTitle` | in | — |
| `department` | `department` | in | — |

</details>

<details><summary><code>users.update</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `id` | `contactId` | in | — |
| `firstname` | `firstName` | in | — |
| `surname` | `lastName` | in | — |
| `client_id` | `clientId` | in | — |
| `emailaddress` | `primaryEmail` | in | — |

</details>

<details><summary><code>assets.list</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `id` | `id` | out | Gorelo uuid carried as opaque string id |
| `inventory_number` | `name` | out | — |
| `client_id` | `clientId` | out | — |
| `site_id` | `clientLocationId` | out | — |

</details>

<details><summary><code>assets.get</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `id` | `id` | out | uuid key |
| `inventory_number` | `name` | out | — |

</details>

<details><summary><code>ticketStatuses.list</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `id` | `id` | out | — |
| `name` | `name` | out | — |
| `colour` | `color` | out | — |

</details>

<details><summary><code>ticketTypes.list</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `id` | `id` | out | — |
| `name` | `name` | out | — |

</details>

<details><summary><code>ticketTags.list</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `id` | `id` | out | — |
| `name` | `name` | out | — |

</details>

<details><summary><code>alerts.create</code> field map</summary>

| Halo | Gorelo | Dir | Transform |
|---|---|---|---|
| `name` | `name` | in | — |
| `client_id` | `clientId` | in | — |
| `resource` | `resource` | in | — |
| `severity` | `severity` | in | AlertLevel enum (1-4) |
| `description` | `description` | in | — |
| `type` | `type` | in | — |

</details>

