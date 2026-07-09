/**
 * Halo (public contract) models. These mirror Halo PSA's actual JSON field
 * names so existing Halo integrations can repoint with near-zero code change.
 * Only the fields the adapter maps are typed explicitly; an index signature
 * preserves any extra fields a real Halo backend returns (passthrough fidelity).
 *
 * Ids are Halo-native (`number`) EXCEPT where Gorelo forces a uuid — those are
 * carried as opaque strings and documented in the manifest (`tickets`, `assets`).
 */

export interface HaloEntity {
  [key: string]: unknown;
}

export interface HaloTicket extends HaloEntity {
  /** int on Halo; opaque uuid string when created via Gorelo. */
  id: number | string;
  summary?: string;
  details?: string;
  client_id?: number;
  site_id?: number;
  user_id?: number;
  status_id?: number;
  team_id?: number;
  tickettype_id?: number;
  agent_id?: number;
  priority_id?: number;
}

export interface HaloTicketCreate {
  summary: string;
  details?: string;
  client_id?: number;
  site_id?: number;
  user_id?: number;
  status_id?: number;
  team_id?: number;
  tickettype_id?: number;
  agent_id?: number;
  priority_id?: number;
  /** Halo source string/id; mapped to Gorelo TicketSource enum. */
  source?: number | string;
  cc_user_ids?: number[];
  tag_ids?: number[];
  watcher_ids?: number[];
}

export interface HaloClient extends HaloEntity {
  id: number;
  name?: string;
  inactive?: boolean;
  billing_name?: string;
  alternate_name?: string;
  website?: string;
  domains?: unknown[];
}

export interface HaloClientCreate {
  name: string;
  billing_name?: string;
  alternate_name?: string;
  website?: string;
}

export interface HaloClientUpdate {
  id: number;
  name?: string;
  inactive?: boolean;
  billing_name?: string;
  alternate_name?: string;
}

export interface HaloSite extends HaloEntity {
  id: number;
  name?: string;
  client_id?: number;
  phonenumber?: string;
}

export interface HaloUser extends HaloEntity {
  id: number;
  firstname?: string;
  surname?: string;
  emailaddress?: string;
  client_id?: number;
  site_id?: number;
  phonenumber?: string;
  mobilenumber?: string;
  jobtitle?: string;
  department?: string;
}

export interface HaloUserCreate {
  firstname?: string;
  surname?: string;
  client_id: number;
  site_id?: number;
  emailaddress?: string;
  phonenumber?: string;
  mobilenumber?: string;
  jobtitle?: string;
  department?: string;
}

export interface HaloUserUpdate {
  id: number;
  firstname?: string;
  surname?: string;
  client_id: number;
  site_id?: number;
  emailaddress?: string;
}

export interface HaloAsset extends HaloEntity {
  /** uuid string from Gorelo; int on Halo. */
  id: number | string;
  inventory_number?: string;
  client_id?: number;
  site_id?: number;
}

export interface HaloLookup extends HaloEntity {
  id: number;
  name?: string;
  colour?: string;
}

/** Gorelo-only extension input. */
export interface HaloAlertCreate {
  name: string;
  client_id: number;
  resource?: string;
  /** 1-4 (Gorelo AlertLevel). */
  severity: number;
  description?: string;
  type?: string;
}
