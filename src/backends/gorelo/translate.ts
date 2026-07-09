/**
 * Pure Halo↔Gorelo translation functions. No I/O — just shape mapping, so they
 * are trivially unit-testable and drive the manifest's `fieldMap` in practice.
 * Never invents data: a Halo field with no Gorelo source is simply absent.
 */

import type {
  HaloAlertCreate,
  HaloAsset,
  HaloClient,
  HaloClientCreate,
  HaloClientUpdate,
  HaloLookup,
  HaloSite,
  HaloTicket,
  HaloTicketCreate,
  HaloUser,
  HaloUserCreate,
  HaloUserUpdate,
} from "../../models/halo.js";
import type {
  GoreloClientResponse,
  GoreloContactResponse,
  GoreloCreateClientCommand,
  GoreloCreateContactCommand,
  GoreloCreateTicketCommand,
  GoreloCreateTicketResult,
  GoreloDeviceResponse,
  GoreloLocationResponse,
  GoreloPostAlertCommand,
  GoreloStatusListItem,
  GoreloTagListItem,
  GoreloTypeListItem,
  GoreloUpdateClientCommand,
  GoreloUpdateContactCommand,
} from "../../models/gorelo.js";
import { toGoreloAlertLevel, toGoreloPriority, toGoreloSource } from "./enums.js";

/** Drop `undefined` keys so we never send `field: undefined` to Gorelo. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as T;
}

// ---- Tickets --------------------------------------------------------------

export function ticketCreateReq(input: HaloTicketCreate): GoreloCreateTicketCommand {
  return compact({
    title: input.summary,
    description: input.details,
    clientId: input.client_id,
    locationId: input.site_id,
    contactId: input.user_id,
    statusId: input.status_id,
    groupId: input.team_id,
    typeId: input.tickettype_id,
    leadAssigneeId: input.agent_id,
    priorityId: toGoreloPriority(input.priority_id),
    sourceId: toGoreloSource(input.source),
    ccContactIds: input.cc_user_ids,
    tagIds: input.tag_ids,
    watcherIds: input.watcher_ids,
  });
}

export function ticketCreateResp(result: GoreloCreateTicketResult, input: HaloTicketCreate): HaloTicket {
  // Gorelo returns only a uuid; echo the input fields we sent so callers get a
  // usable object. The id is an opaque uuid string, never faked as an int.
  return compact({
    id: result.ticketId ?? "",
    summary: input.summary,
    details: input.details,
    client_id: input.client_id,
    site_id: input.site_id,
    user_id: input.user_id,
    status_id: input.status_id,
    team_id: input.team_id,
    tickettype_id: input.tickettype_id,
    agent_id: input.agent_id,
    priority_id: input.priority_id,
  });
}

// ---- Clients --------------------------------------------------------------

export function clientResp(g: GoreloClientResponse): HaloClient {
  return compact({
    id: g.id,
    name: g.name ?? undefined,
    billing_name: g.billingName ?? undefined,
    alternate_name: g.alternateName ?? undefined,
    // statusId semantics are not published; surface the raw value and a best-effort flag.
    inactive: g.statusId != null ? g.statusId !== 1 : undefined,
    domains: g.domains ?? undefined,
  });
}

export function clientCreateReq(input: HaloClientCreate): GoreloCreateClientCommand {
  return compact({
    name: input.name,
    billingName: input.billing_name,
    alternateName: input.alternate_name,
    domain: input.website,
  });
}

export function clientUpdateReq(input: HaloClientUpdate): GoreloUpdateClientCommand {
  return compact({
    id: input.id,
    name: input.name,
    billingName: input.billing_name,
    alternateName: input.alternate_name,
    statusId: input.inactive === undefined ? undefined : input.inactive ? 0 : 1,
  });
}

// ---- Sites (Gorelo locations) --------------------------------------------

export function locationResp(g: GoreloLocationResponse): HaloSite {
  return compact({
    id: g.id,
    name: g.name ?? undefined,
    client_id: g.clientId,
    phonenumber: g.phone ?? undefined,
  });
}

// ---- Users / contacts -----------------------------------------------------

export function contactResp(g: GoreloContactResponse): HaloUser {
  return compact({
    id: g.id,
    firstname: g.firstName ?? undefined,
    surname: g.lastName ?? undefined,
    emailaddress: g.primaryEmail ?? undefined,
    client_id: g.clientId ?? undefined,
    site_id: g.clientLocationId ?? undefined,
    phonenumber: g.officePhone ?? undefined,
    mobilenumber: g.mobilePhone ?? undefined,
    jobtitle: g.jobTitle ?? undefined,
    department: g.department ?? undefined,
  });
}

export function contactCreateReq(input: HaloUserCreate): GoreloCreateContactCommand {
  return compact({
    firstName: input.firstname,
    lastName: input.surname,
    clientId: input.client_id,
    clientLocationId: input.site_id,
    primaryEmail: input.emailaddress,
    officePhone: input.phonenumber,
    mobilePhone: input.mobilenumber,
    jobTitle: input.jobtitle,
    department: input.department,
  }) as GoreloCreateContactCommand;
}

export function contactUpdateReq(input: HaloUserUpdate): GoreloUpdateContactCommand {
  return compact({
    contactId: input.id,
    firstName: input.firstname,
    lastName: input.surname,
    clientId: input.client_id,
    clientLocationId: input.site_id,
    primaryEmail: input.emailaddress,
  }) as GoreloUpdateContactCommand;
}

// ---- Assets ---------------------------------------------------------------

export function deviceResp(g: GoreloDeviceResponse): HaloAsset {
  return compact({
    id: g.id, // uuid, opaque string
    inventory_number: g.name ?? undefined,
    client_id: g.clientId ?? undefined,
    site_id: g.clientLocationId ?? undefined,
  });
}

// ---- Lookups --------------------------------------------------------------

export function statusResp(g: GoreloStatusListItem): HaloLookup {
  return compact({ id: g.id, name: g.name ?? undefined, colour: g.color ?? undefined });
}

export function typeResp(g: GoreloTypeListItem): HaloLookup {
  return compact({ id: g.id, name: g.name ?? undefined });
}

export function tagResp(g: GoreloTagListItem): HaloLookup {
  return compact({ id: g.id, name: g.name ?? undefined });
}

// ---- Alerts (Gorelo-only) -------------------------------------------------

export function alertReq(input: HaloAlertCreate): GoreloPostAlertCommand {
  return compact({
    name: input.name,
    clientId: input.client_id,
    resource: input.resource,
    severity: toGoreloAlertLevel(input.severity),
    description: input.description,
    type: input.type,
  });
}
