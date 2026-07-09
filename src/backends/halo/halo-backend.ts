/**
 * HaloBackend — a thin passthrough to a real Halo PSA instance (OAuth2
 * client-credentials, token cached/refreshed). Because the public surface *is*
 * Halo's shape, translation here is near-identity; this backend is the reference
 * oracle that proves the contract is faithful.
 */

import type {
  AlertBackend,
  ActionBackend,
  AssetBackend,
  Backend,
  ClientBackend,
  ContractBackend,
  InvoiceBackend,
  ListParams,
  LookupBackend,
  SiteBackend,
  TicketBackend,
  UserBackend,
} from "../../backend.js";
import type { ResolvedConfig } from "../../config.js";
import { HaloAdapterError, ValidationError } from "../../errors.js";
import { HttpClient } from "../../http.js";
import type { RequestOptions } from "../../http.js";
import type { HaloEntity } from "../../models/halo.js";
import type { HaloPage, PageParams } from "../../pagination.js";
import { HaloTokenManager } from "./auth.js";

/** Coerce a Halo response into the paged envelope shape. */
function asPage<T>(data: unknown, key: string, params?: PageParams): HaloPage<T> {
  if (data && typeof data === "object" && "record_count" in (data as object)) {
    return data as HaloPage<T>;
  }
  const items = (Array.isArray(data) ? data : []) as T[];
  const total = items.length;
  let windowed = items;
  if (params?.page_size && params.page_size > 0) {
    const page = params.page_no && params.page_no > 0 ? params.page_no : 1;
    windowed = items.slice((page - 1) * params.page_size, (page - 1) * params.page_size + params.page_size);
  }
  return { record_count: total, [key]: windowed } as HaloPage<T>;
}

export class HaloBackend implements Backend {
  readonly provider = "halo" as const;
  private readonly http: HttpClient;

  constructor(cfg: ResolvedConfig) {
    if (cfg.auth.kind !== "halo") {
      throw new ValidationError("HaloBackend requires halo auth", { provider: "halo" });
    }
    const tokens = new HaloTokenManager(cfg.auth, cfg);
    this.http = new HttpClient(cfg, "halo", tokens.headers);
  }

  private async get<T>(opts: Omit<RequestOptions, "method">): Promise<T> {
    const res = await this.http.request<T>({ ...opts, method: "GET" });
    return res.data;
  }

  private async listOf<T>(
    path: string,
    key: string,
    resource: string,
    params?: ListParams,
  ): Promise<HaloPage<T>> {
    const query: RequestOptions["query"] = {};
    if (params?.page_no !== undefined) query["page_no"] = params.page_no;
    if (params?.page_size !== undefined) query["page_size"] = params.page_size;
    if (params?.client_id !== undefined) query["client_id"] = params.client_id;
    const data = await this.get<unknown>({ path, query, resource, operation: "list" });
    return asPage<T>(data, key, params);
  }

  /** Halo POST endpoints take an array of entities and return the created array. */
  private async post<T>(path: string, input: unknown, resource: string, operation: string): Promise<T> {
    const res = await this.http.request<T | T[]>({
      method: "POST",
      path,
      body: [input],
      resource,
      operation,
    });
    return Array.isArray(res.data) ? (res.data[0] as T) : (res.data as T);
  }

  private async del(path: string, resource: string): Promise<void> {
    await this.http.request<unknown>({ method: "DELETE", path, resource, operation: "delete" });
  }

  readonly tickets: TicketBackend = {
    list: (params) => this.listOf("/Tickets", "tickets", "tickets", params),
    get: (id) => this.get({ path: `/Tickets/${id}`, resource: "tickets", operation: "get" }),
    create: (input) => this.post("/Tickets", input, "tickets", "create"),
    update: (input) => this.post("/Tickets", input, "tickets", "update"),
    delete: (id) => this.del(`/Tickets/${id}`, "tickets"),
  };

  readonly actions: ActionBackend = {
    list: (params) => this.listOf("/Actions", "actions", "actions", params),
    create: (input) => this.post("/Actions", input, "actions", "create"),
  };

  readonly clients: ClientBackend = {
    list: (params) => this.listOf("/Client", "clients", "clients", params),
    get: (id) => this.get({ path: `/Client/${id}`, resource: "clients", operation: "get" }),
    create: (input) => this.post("/Client", input, "clients", "create"),
    update: (input) => this.post("/Client", input, "clients", "update"),
    delete: (id) => this.del(`/Client/${id}`, "clients"),
  };

  readonly sites: SiteBackend = {
    list: (params) => this.listOf("/Site", "sites", "sites", params),
    get: (id) => this.get({ path: `/Site/${id}`, resource: "sites", operation: "get" }),
    create: (input) => this.post("/Site", input, "sites", "create"),
    update: (input) => this.post("/Site", input, "sites", "update"),
    delete: (id) => this.del(`/Site/${id}`, "sites"),
  };

  readonly users: UserBackend = {
    list: (params) => this.listOf("/Users", "users", "users", params),
    get: (id) => this.get({ path: `/Users/${id}`, resource: "users", operation: "get" }),
    create: (input) => this.post("/Users", input, "users", "create"),
    update: (input) => this.post("/Users", input, "users", "update"),
    delete: (id) => this.del(`/Users/${id}`, "users"),
  };

  readonly assets: AssetBackend = {
    list: (params) => this.listOf("/Asset", "assets", "assets", params),
    get: (id) => this.get({ path: `/Asset/${id}`, resource: "assets", operation: "get" }),
    create: (input) => this.post("/Asset", input, "assets", "create"),
    update: (input) => this.post("/Asset", input, "assets", "update"),
    delete: (id) => this.del(`/Asset/${id}`, "assets"),
  };

  private lookup(path: string, key: string, resource: string): LookupBackend {
    return { list: (params?: PageParams) => this.listOf(path, key, resource, params) };
  }

  readonly ticketStatuses: LookupBackend = this.lookup("/Status", "statuses", "ticketStatuses");
  readonly ticketTypes: LookupBackend = this.lookup("/TicketType", "types", "ticketTypes");
  readonly ticketTags: LookupBackend = this.lookup("/TicketTag", "tags", "ticketTags");
  readonly teams: LookupBackend = this.lookup("/Team", "teams", "teams");
  readonly agents: LookupBackend = this.lookup("/Agent", "agents", "agents");

  readonly invoices: InvoiceBackend = {
    list: (params) => this.listOf("/Invoice", "invoices", "invoices", params),
    get: (id) => this.get({ path: `/Invoice/${id}`, resource: "invoices", operation: "get" }),
  };

  readonly contracts: ContractBackend = {
    list: (params) => this.listOf<HaloEntity>("/ClientContract", "contracts", "contracts", params),
  };

  readonly alerts: AlertBackend = {
    // Alerts are a Gorelo-only extension; Halo has no public create-alert analog.
    create: () =>
      Promise.reject(
        new HaloAdapterError(
          "alerts.create is a Gorelo-only extension and is not available on the Halo backend",
          { code: "CAPABILITY_UNSUPPORTED", provider: "halo", resource: "alerts", operation: "create" },
        ),
      ),
  };
}
