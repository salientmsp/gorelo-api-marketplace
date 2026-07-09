/**
 * The Gorelo capability manifest — seeded from `docs/gorelo-halo-feature-matrix.md`
 * and verified against the vendored spec at `spec/gorelo-public-api.v1.json`.
 *
 * This describes coverage of the **Gorelo** backend. The Halo backend is a
 * faithful passthrough, so every public operation is `full` there by definition;
 * only Gorelo needs a manifest because it is the incomplete, moving target.
 *
 * Editing rule: change one entry here, one translator in `backends/gorelo`, and
 * one test. Then regenerate the matrix (`npm run matrix`). Never hand-edit the
 * generated matrix files.
 */

import type { CapabilityManifest, ManifestEntry } from "./types.js";
import { opKey } from "./types.js";

function entry(e: ManifestEntry): ManifestEntry {
  return e;
}

const entries: ManifestEntry[] = [
  // ---- Tickets: write-only on Gorelo ------------------------------------
  entry({
    resource: "tickets",
    operation: "list",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["Gorelo publishes no ticket list endpoint. Blocks any sync/read integration."],
  }),
  entry({
    resource: "tickets",
    operation: "get",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["No get-by-id. A created ticket cannot be round-tripped."],
  }),
  entry({
    resource: "tickets",
    operation: "create",
    status: "partial",
    goreloRef: ["POST /v1/tickets"],
    fieldMap: [
      { halo: "summary", gorelo: "title", direction: "in" },
      { halo: "details", gorelo: "description", direction: "in" },
      { halo: "client_id", gorelo: "clientId", direction: "in" },
      { halo: "site_id", gorelo: "locationId", direction: "in" },
      { halo: "user_id", gorelo: "contactId", direction: "in" },
      { halo: "status_id", gorelo: "statusId", direction: "in" },
      { halo: "team_id", gorelo: "groupId", direction: "in" },
      { halo: "tickettype_id", gorelo: "typeId", direction: "in" },
      { halo: "agent_id", gorelo: "leadAssigneeId", direction: "in" },
      {
        halo: "priority_id",
        gorelo: "priorityId",
        direction: "in",
        transform: "Halo priority id → Gorelo PublicTicketPriority enum (0-4)",
      },
      {
        halo: "source",
        gorelo: "sourceId",
        direction: "in",
        transform: "Halo source → Gorelo TicketSource enum (1-6)",
      },
      {
        halo: "id",
        gorelo: "ticketId",
        direction: "out",
        transform: "Gorelo returns a uuid, not an int; carried as an opaque string id",
      },
    ],
    unsupportedParams: [
      "customfields",
      "sla_id",
      "category_1",
      "category_2",
      "assets",
      "attachments",
      "actions",
    ],
    caveats: [
      "Result id is a uuid, not a Halo int64. Callers must treat ticket ids as opaque strings.",
      "statusId/typeId must be resolved via the ticket lookup endpoints first.",
      "priority and source are inline enums with no lookup endpoint; maps are hardcoded and tested.",
      "No custom fields, SLA, or category tree beyond type/tag.",
    ],
  }),
  entry({
    resource: "tickets",
    operation: "update",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["No update/patch path for tickets."],
  }),
  entry({
    resource: "tickets",
    operation: "delete",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["No delete path for tickets."],
  }),

  // ---- Actions / comments -----------------------------------------------
  entry({
    resource: "actions",
    operation: "list",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["No public conversation/actions endpoint."],
  }),
  entry({
    resource: "actions",
    operation: "create",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["No public conversation/actions endpoint."],
  }),

  // ---- Clients -----------------------------------------------------------
  entry({
    resource: "clients",
    operation: "list",
    status: "partial",
    goreloRef: ["GET /v1/clients"],
    fieldMap: [
      { halo: "id", gorelo: "id", direction: "out" },
      { halo: "name", gorelo: "name", direction: "out" },
      { halo: "inactive", gorelo: "statusId", direction: "out", transform: "statusId → inactive flag (best-effort)" },
    ],
    unsupportedParams: ["page_no", "page_size", "search", "order", "orderdesc"],
    caveats: [
      "Bare unpaginated array; Halo's record_count/page_* envelope is synthesized client-side.",
      "No server-side search or ordering.",
    ],
  }),
  entry({
    resource: "clients",
    operation: "get",
    status: "full",
    goreloRef: ["GET /v1/clients/{id}"],
    fieldMap: [
      { halo: "id", gorelo: "id", direction: "out" },
      { halo: "name", gorelo: "name", direction: "out" },
      { halo: "domains", gorelo: "domains", direction: "out" },
    ],
    unsupportedParams: [],
    caveats: ["int64 id."],
  }),
  entry({
    resource: "clients",
    operation: "create",
    status: "partial",
    goreloRef: ["POST /v1/clients"],
    fieldMap: [
      { halo: "name", gorelo: "name", direction: "in" },
      { halo: "billing_name", gorelo: "billingName", direction: "in" },
      { halo: "alternate_name", gorelo: "alternateName", direction: "in" },
      { halo: "website", gorelo: "domain", direction: "in", transform: "primary website → domain" },
    ],
    unsupportedParams: ["notes", "customfields", "toplevel_id", "pricebook_id"],
    caveats: ["Only name, billingName, alternateName, domain, and one nested location are accepted."],
  }),
  entry({
    resource: "clients",
    operation: "update",
    status: "partial",
    goreloRef: ["PATCH /v1/clients"],
    fieldMap: [
      { halo: "id", gorelo: "id", direction: "in" },
      { halo: "name", gorelo: "name", direction: "in" },
      { halo: "inactive", gorelo: "statusId", direction: "in", transform: "inactive flag → statusId (best-effort)" },
      { halo: "billing_name", gorelo: "billingName", direction: "in" },
      { halo: "alternate_name", gorelo: "alternateName", direction: "in" },
    ],
    unsupportedParams: ["notes", "customfields", "website"],
    caveats: ["Only id, name, statusId, billingName, alternateName are patchable."],
  }),
  entry({
    resource: "clients",
    operation: "delete",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["No client delete path."],
  }),

  // ---- Sites (Gorelo client locations) ----------------------------------
  entry({
    resource: "sites",
    operation: "list",
    status: "partial",
    goreloRef: ["GET /v1/clients/{clientId}/locations"],
    fieldMap: [
      { halo: "id", gorelo: "id", direction: "out" },
      { halo: "name", gorelo: "name", direction: "out" },
      { halo: "client_id", gorelo: "clientId", direction: "out" },
      { halo: "phonenumber", gorelo: "phone", direction: "out" },
    ],
    unsupportedParams: ["page_no", "page_size", "search"],
    caveats: [
      "Requires a client_id filter; there is no global site list.",
      "Bare unpaginated array; envelope synthesized client-side.",
    ],
  }),
  entry({
    resource: "sites",
    operation: "get",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["No /locations/{id} endpoint. Fetch via the client's location list and filter client-side."],
  }),
  entry({
    resource: "sites",
    operation: "create",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["No standalone location create; a location may only be nested on client create."],
  }),
  entry({
    resource: "sites",
    operation: "update",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["No location update path."],
  }),
  entry({
    resource: "sites",
    operation: "delete",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["No location delete path."],
  }),

  // ---- Users / contacts --------------------------------------------------
  entry({
    resource: "users",
    operation: "list",
    status: "partial",
    goreloRef: ["GET /v1/contacts"],
    fieldMap: [
      { halo: "id", gorelo: "id", direction: "out" },
      { halo: "firstname", gorelo: "firstName", direction: "out" },
      { halo: "surname", gorelo: "lastName", direction: "out" },
      { halo: "emailaddress", gorelo: "primaryEmail", direction: "out" },
      { halo: "client_id", gorelo: "clientId", direction: "both" },
      { halo: "site_id", gorelo: "clientLocationId", direction: "out" },
    ],
    unsupportedParams: ["page_no", "page_size", "search", "order"],
    caveats: [
      "Filters only by ContactIds and clientid; other Halo filters become unsupportedParams.",
      "Bare unpaginated array; envelope synthesized client-side.",
    ],
  }),
  entry({
    resource: "users",
    operation: "get",
    status: "full",
    goreloRef: ["GET /v1/contacts/{id}"],
    fieldMap: [
      { halo: "id", gorelo: "id", direction: "out" },
      { halo: "firstname", gorelo: "firstName", direction: "out" },
      { halo: "surname", gorelo: "lastName", direction: "out" },
      { halo: "emailaddress", gorelo: "primaryEmail", direction: "out" },
    ],
    unsupportedParams: [],
    caveats: ["int64 id."],
  }),
  entry({
    resource: "users",
    operation: "create",
    status: "partial",
    goreloRef: ["POST /v1/contacts"],
    fieldMap: [
      { halo: "firstname", gorelo: "firstName", direction: "in" },
      { halo: "surname", gorelo: "lastName", direction: "in" },
      { halo: "client_id", gorelo: "clientId", direction: "in" },
      { halo: "site_id", gorelo: "clientLocationId", direction: "in" },
      { halo: "emailaddress", gorelo: "primaryEmail", direction: "in" },
      { halo: "phonenumber", gorelo: "officePhone", direction: "in" },
      { halo: "mobilenumber", gorelo: "mobilePhone", direction: "in" },
      { halo: "jobtitle", gorelo: "jobTitle", direction: "in" },
      { halo: "department", gorelo: "department", direction: "in" },
    ],
    unsupportedParams: ["customfields", "isimportantcontact", "login"],
    caveats: ["clientId is required by Gorelo."],
  }),
  entry({
    resource: "users",
    operation: "update",
    status: "partial",
    goreloRef: ["PATCH /v1/contacts"],
    fieldMap: [
      { halo: "id", gorelo: "contactId", direction: "in" },
      { halo: "firstname", gorelo: "firstName", direction: "in" },
      { halo: "surname", gorelo: "lastName", direction: "in" },
      { halo: "client_id", gorelo: "clientId", direction: "in" },
      { halo: "emailaddress", gorelo: "primaryEmail", direction: "in" },
    ],
    unsupportedParams: ["customfields"],
    caveats: ["Keyed on contactId in the body; clientId is required."],
  }),
  entry({
    resource: "users",
    operation: "delete",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["No contact delete path."],
  }),

  // ---- Assets ------------------------------------------------------------
  entry({
    resource: "assets",
    operation: "list",
    status: "partial",
    goreloRef: ["GET /v1/assets/agents"],
    fieldMap: [
      { halo: "id", gorelo: "id", direction: "out", transform: "Gorelo uuid carried as opaque string id" },
      { halo: "inventory_number", gorelo: "name", direction: "out" },
      { halo: "client_id", gorelo: "clientId", direction: "out" },
      { halo: "site_id", gorelo: "clientLocationId", direction: "out" },
    ],
    unsupportedParams: ["page_no", "page_size", "assettype_id", "search"],
    caveats: [
      "RMM agents only; no custom/non-agent assets.",
      "id is a uuid, carried as an opaque string.",
      "Bare unpaginated array; envelope synthesized client-side.",
    ],
  }),
  entry({
    resource: "assets",
    operation: "get",
    status: "partial",
    goreloRef: ["GET /v1/assets/agents/{id}"],
    fieldMap: [
      { halo: "id", gorelo: "id", direction: "out", transform: "uuid key" },
      { halo: "inventory_number", gorelo: "name", direction: "out" },
    ],
    unsupportedParams: [],
    caveats: ["uuid key, not int."],
  }),
  entry({
    resource: "assets",
    operation: "create",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["Asset write is not exposed."],
  }),
  entry({
    resource: "assets",
    operation: "update",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["Asset write is not exposed."],
  }),
  entry({
    resource: "assets",
    operation: "delete",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["Asset write is not exposed."],
  }),

  // ---- Lookups -----------------------------------------------------------
  entry({
    resource: "ticketStatuses",
    operation: "list",
    status: "full",
    goreloRef: ["GET /v1/tickets/statuses"],
    fieldMap: [
      { halo: "id", gorelo: "id", direction: "out" },
      { halo: "name", gorelo: "name", direction: "out" },
      { halo: "colour", gorelo: "color", direction: "out" },
    ],
    unsupportedParams: [],
    caveats: ["Includes baseStatusId, color, sortOrder."],
  }),
  entry({
    resource: "ticketTypes",
    operation: "list",
    status: "full",
    goreloRef: ["GET /v1/tickets/types"],
    fieldMap: [
      { halo: "id", gorelo: "id", direction: "out" },
      { halo: "name", gorelo: "name", direction: "out" },
    ],
    unsupportedParams: [],
    caveats: [],
  }),
  entry({
    resource: "ticketTags",
    operation: "list",
    status: "full",
    goreloRef: ["GET /v1/tickets/tags"],
    fieldMap: [
      { halo: "id", gorelo: "id", direction: "out" },
      { halo: "name", gorelo: "name", direction: "out" },
    ],
    unsupportedParams: [],
    caveats: [],
  }),
  entry({
    resource: "teams",
    operation: "list",
    status: "partial",
    goreloRef: ["GET /v1/organization/groups"],
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["Response schema is not published by Gorelo; passed through as loosely-typed objects until a live tenant is probed."],
  }),
  entry({
    resource: "agents",
    operation: "list",
    status: "partial",
    goreloRef: ["GET /v1/organization/users"],
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["Response schema is not published by Gorelo; passed through as loosely-typed objects until a live tenant is probed."],
  }),

  // ---- Finance surface: entirely missing --------------------------------
  entry({
    resource: "invoices",
    operation: "list",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["Gorelo has no billing/finance surface."],
  }),
  entry({
    resource: "invoices",
    operation: "get",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["Gorelo has no billing/finance surface."],
  }),
  entry({
    resource: "contracts",
    operation: "list",
    status: "missing",
    goreloRef: null,
    fieldMap: [],
    unsupportedParams: [],
    caveats: ["Gorelo has no contracts surface."],
  }),

  // ---- Gorelo-only extension --------------------------------------------
  entry({
    resource: "alerts",
    operation: "create",
    status: "full",
    goreloRef: ["POST /v1/alerts/"],
    fieldMap: [
      { halo: "name", gorelo: "name", direction: "in" },
      { halo: "client_id", gorelo: "clientId", direction: "in" },
      { halo: "resource", gorelo: "resource", direction: "in" },
      {
        halo: "severity",
        gorelo: "severity",
        direction: "in",
        transform: "AlertLevel enum (1-4)",
      },
      { halo: "description", gorelo: "description", direction: "in" },
      { halo: "type", gorelo: "type", direction: "in" },
    ],
    unsupportedParams: [],
    caveats: [
      "Gorelo-only: no Halo public 'create alert' analog. Exposed as a library extension, not part of the Halo contract.",
    ],
  }),
];

/** The full manifest, indexed by `"resource.operation"`. */
export const goreloManifest: CapabilityManifest = Object.fromEntries(
  entries.map((e) => [opKey(e.resource, e.operation), e]),
) as CapabilityManifest;

/** Flat list of all manifest entries, in declaration order. */
export const manifestEntries: readonly ManifestEntry[] = entries;
