/**
 * Gorelo request/response models, transcribed from the vendored spec at
 * `spec/gorelo-public-api.v1.json` (OpenAPI 3.0.1). Only the shapes the adapter
 * touches are modeled. Optional fields mirror the spec's `nullable`.
 */

/** `PublicTicketPriority` — inline enum, no lookup endpoint. */
export type GoreloTicketPriority = 0 | 1 | 2 | 3 | 4;
/** `TicketSource` — inline enum, no lookup endpoint. */
export type GoreloTicketSource = 1 | 2 | 3 | 4 | 5 | 6;
/** `AlertLevel` — inline enum, no lookup endpoint. */
export type GoreloAlertLevel = 1 | 2 | 3 | 4;

export interface GoreloCreateTicketCommand {
  title?: string | null;
  createdByName?: string | null;
  clientId?: number | null;
  locationId?: number | null;
  contactId?: number | null;
  ccContactIds?: number[] | null;
  statusId?: number | null;
  groupId?: number;
  description?: string | null;
  priorityId?: GoreloTicketPriority;
  sourceId?: GoreloTicketSource;
  typeId?: number;
  leadAssigneeId?: number | null;
  assistingAssigneeIds?: number[] | null;
  watcherIds?: number[] | null;
  tagIds?: number[] | null;
  agentAssetIds?: string[] | null;
  customAssetIds?: string[] | null;
  uptimeIds?: string[] | null;
  sendTicketCreatedEmail?: boolean | null;
  isUnread?: boolean | null;
}

export interface GoreloCreateTicketResult {
  /** uuid, not an int. */
  ticketId?: string | null;
}

export interface GoreloClientResponse {
  id: number;
  name?: string | null;
  statusId?: number | null;
  createdOn?: string | null;
  updatedOn?: string | null;
  billingName?: string | null;
  alternateName?: string | null;
  isDefault?: boolean | null;
  domains?: unknown[] | null;
}

export interface GoreloCreateClientCommand {
  name?: string | null;
  billingName?: string | null;
  alternateName?: string | null;
  domain?: string | null;
  location?: unknown;
}

export interface GoreloUpdateClientCommand {
  id: number;
  name?: string | null;
  statusId?: number | null;
  billingName?: string | null;
  alternateName?: string | null;
}

export interface GoreloLocationResponse {
  id: number;
  name?: string | null;
  clientId: number;
  primaryContactId?: number | null;
  phoneCountryCode?: string | null;
  phone?: string | null;
  phoneExt?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  geoLocationLatitude?: number | null;
  geoLocationLongitude?: number | null;
  timeZone?: string | null;
  isDefault?: boolean | null;
  isDefaultBilling?: boolean | null;
}

export interface GoreloContactResponse {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  statusId?: number | null;
  clientId?: number | null;
  clientLocationId?: number | null;
  primaryEmail?: string | null;
  mobilePhone?: string | null;
  mobilePhoneCountryCode?: string | null;
  officePhone?: string | null;
  officePhoneCountryCode?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  timeZone?: string | null;
  description?: string | null;
}

export interface GoreloCreateContactCommand {
  firstName?: string | null;
  lastName?: string | null;
  clientId: number;
  clientLocationId?: number | null;
  primaryEmail?: string | null;
  secondaryEmail?: string[] | null;
  mobilePhone?: string | null;
  mobilePhoneCountryCode?: string | null;
  officePhone?: string | null;
  officePhoneCountryCode?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  timeZone?: string | null;
  description?: string | null;
}

export interface GoreloUpdateContactCommand extends Omit<GoreloCreateContactCommand, never> {
  contactId: number;
}

export interface GoreloDeviceResponse {
  /** uuid. */
  id: string;
  name?: string | null;
  statusId?: number | null;
  clientId?: number | null;
  clientLocationId?: number | null;
  displayName?: string | null;
  os?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNo?: string | null;
  localIPAddress?: string | null;
  publicIPAddress?: string | null;
  lastBootUpTime?: string | null;
  warrantyExpiryDate?: string | null;
}

export interface GoreloStatusListItem {
  id: number;
  name?: string | null;
  baseStatusId?: number;
  color?: string | null;
  sortOrder?: number;
  description?: string | null;
}

export interface GoreloTypeListItem {
  id: number;
  name?: string | null;
  description?: string | null;
}

export interface GoreloTagListItem {
  id: number;
  name?: string | null;
  description?: string | null;
}

export interface GoreloPostAlertCommand {
  name?: string | null;
  clientId?: number;
  resource?: string | null;
  severity?: GoreloAlertLevel;
  description?: string | null;
  type?: string | null;
}
