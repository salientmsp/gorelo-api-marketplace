/**
 * Provider interface. Every resource operation the public surface exposes is a
 * method a backend must implement. `HaloBackend` implements all of them as a
 * faithful passthrough (the reference oracle); `GoreloBackend` implements the
 * ones Gorelo supports and, for gaps, throws `CapabilityUnsupportedError` (or
 * degrades, per config).
 */

import type { ProviderName } from "./errors.js";
import type { HaloPage, PageParams } from "./pagination.js";
import type {
  HaloAlertCreate,
  HaloAsset,
  HaloClient,
  HaloClientCreate,
  HaloClientUpdate,
  HaloEntity,
  HaloLookup,
  HaloSite,
  HaloTicket,
  HaloTicketCreate,
  HaloUser,
  HaloUserCreate,
  HaloUserUpdate,
} from "./models/halo.js";

export interface ListParams extends PageParams {
  /** Restrict to a client (maps to Gorelo `clientid`). */
  client_id?: number;
  /** Restrict to specific ids (maps to Gorelo `ContactIds`/`ids`). */
  ids?: Array<number | string>;
}

export interface TicketBackend {
  list(params?: ListParams): Promise<HaloPage<HaloTicket>>;
  get(id: number | string): Promise<HaloTicket>;
  create(input: HaloTicketCreate): Promise<HaloTicket>;
  update(input: Partial<HaloTicket> & { id: number | string }): Promise<HaloTicket>;
  delete(id: number | string): Promise<void>;
}

export interface ClientBackend {
  list(params?: ListParams): Promise<HaloPage<HaloClient>>;
  get(id: number): Promise<HaloClient>;
  create(input: HaloClientCreate): Promise<HaloClient>;
  update(input: HaloClientUpdate): Promise<HaloClient>;
  delete(id: number): Promise<void>;
}

export interface SiteBackend {
  list(params?: ListParams): Promise<HaloPage<HaloSite>>;
  get(id: number): Promise<HaloSite>;
  create(input: Partial<HaloSite> & { name: string; client_id: number }): Promise<HaloSite>;
  update(input: Partial<HaloSite> & { id: number }): Promise<HaloSite>;
  delete(id: number): Promise<void>;
}

export interface UserBackend {
  list(params?: ListParams): Promise<HaloPage<HaloUser>>;
  get(id: number): Promise<HaloUser>;
  create(input: HaloUserCreate): Promise<HaloUser>;
  update(input: HaloUserUpdate): Promise<HaloUser>;
  delete(id: number): Promise<void>;
}

export interface AssetBackend {
  list(params?: ListParams): Promise<HaloPage<HaloAsset>>;
  get(id: number | string): Promise<HaloAsset>;
  create(input: Partial<HaloAsset>): Promise<HaloAsset>;
  update(input: Partial<HaloAsset> & { id: number | string }): Promise<HaloAsset>;
  delete(id: number | string): Promise<void>;
}

export interface LookupBackend {
  list(params?: PageParams): Promise<HaloPage<HaloLookup>>;
}

export interface AlertBackend {
  /** Gorelo-only extension. */
  create(input: HaloAlertCreate): Promise<{ ok: true }>;
}

/** Gap resources — modeled so callers get a typed error, not a missing method. */
export interface ActionBackend {
  list(params?: ListParams): Promise<HaloPage<HaloEntity>>;
  create(input: HaloEntity): Promise<HaloEntity>;
}

export interface InvoiceBackend {
  list(params?: ListParams): Promise<HaloPage<HaloEntity>>;
  get(id: number): Promise<HaloEntity>;
}

export interface ContractBackend {
  list(params?: ListParams): Promise<HaloPage<HaloEntity>>;
}

export interface Backend {
  readonly provider: ProviderName;
  readonly tickets: TicketBackend;
  readonly actions: ActionBackend;
  readonly clients: ClientBackend;
  readonly sites: SiteBackend;
  readonly users: UserBackend;
  readonly assets: AssetBackend;
  readonly ticketStatuses: LookupBackend;
  readonly ticketTypes: LookupBackend;
  readonly ticketTags: LookupBackend;
  readonly teams: LookupBackend;
  readonly agents: LookupBackend;
  readonly invoices: InvoiceBackend;
  readonly contracts: ContractBackend;
  readonly alerts: AlertBackend;
}
