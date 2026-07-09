/**
 * GoreloBackend — translates Halo-shaped requests to the Gorelo API and back,
 * enforcing the capability manifest. Supported ops translate; unsupported ops
 * throw `CapabilityUnsupportedError` (or degrade, per config).
 *
 * `IMPLEMENTED` is this backend's independent, hand-maintained declaration of
 * which operations it actually translates. The CI gate asserts it agrees with
 * the manifest's `full`/`partial` set — that is the anti-drift check.
 */

import type {
  AlertBackend,
  AssetBackend,
  ActionBackend,
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
import { CapabilityUnsupportedError, ValidationError } from "../../errors.js";
import { HttpClient } from "../../http.js";
import { goreloManifest } from "../../manifest/manifest.js";
import type { OperationKey, OperationName, ResourceName } from "../../manifest/types.js";
import { isSupported, opKey } from "../../manifest/types.js";
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
} from "../../models/halo.js";
import type {
  GoreloClientResponse,
  GoreloContactResponse,
  GoreloCreateTicketResult,
  GoreloDeviceResponse,
  GoreloLocationResponse,
  GoreloStatusListItem,
  GoreloTagListItem,
  GoreloTypeListItem,
} from "../../models/gorelo.js";
import type { HaloPage, PageParams } from "../../pagination.js";
import { toHaloPage } from "../../pagination.js";
import { goreloAuthHeaders } from "./auth.js";
import * as t from "./translate.js";

/** Operations GoreloBackend actually translates. Kept in lockstep with the
 * manifest by the CI gate — see `implementedOperations()` and the gate test. */
const IMPLEMENTED: ReadonlySet<OperationKey> = new Set<OperationKey>([
  "tickets.create",
  "clients.list",
  "clients.get",
  "clients.create",
  "clients.update",
  "sites.list",
  "users.list",
  "users.get",
  "users.create",
  "users.update",
  "assets.list",
  "assets.get",
  "ticketStatuses.list",
  "ticketTypes.list",
  "ticketTags.list",
  "teams.list",
  "agents.list",
  "alerts.create",
]);

export class GoreloBackend implements Backend {
  readonly provider = "gorelo" as const;
  private readonly cfg: ResolvedConfig;
  private readonly http: HttpClient;

  constructor(cfg: ResolvedConfig) {
    if (cfg.auth.kind !== "gorelo") {
      throw new ValidationError("GoreloBackend requires gorelo auth", { provider: "gorelo" });
    }
    this.cfg = cfg;
    this.http = new HttpClient(cfg, "gorelo", goreloAuthHeaders(cfg.auth));
  }

  /** The implementation's own list of translated operations. */
  static implementedOperations(): ReadonlySet<OperationKey> {
    return IMPLEMENTED;
  }

  // ---- gap handling -------------------------------------------------------

  private gap(resource: ResourceName, operation: OperationName): never {
    throw new CapabilityUnsupportedError(goreloManifest[opKey(resource, operation)], "gorelo");
  }

  /** For unsupported list ops: empty page in degrade mode, else throw. */
  private gapList<T>(
    resource: ResourceName,
    key: string,
    params: PageParams | undefined,
  ): HaloPage<T> {
    const entry = goreloManifest[opKey(resource, "list")];
    if (this.cfg.mode === "degrade") {
      this.cfg.logger.warn("capability.degrade", { resource, operation: "list", status: entry.status });
      return toHaloPage<T>(key, [], params);
    }
    throw new CapabilityUnsupportedError(entry, "gorelo");
  }

  /** For unsupported delete ops: no-op in degrade mode, else throw. */
  private async gapVoid(resource: ResourceName, operation: OperationName): Promise<void> {
    const entry = goreloManifest[opKey(resource, operation)];
    if (this.cfg.mode === "degrade") {
      this.cfg.logger.warn("capability.degrade", { resource, operation, status: entry.status });
      return;
    }
    throw new CapabilityUnsupportedError(entry, "gorelo");
  }

  // ---- tickets ------------------------------------------------------------

  readonly tickets: TicketBackend = {
    list: async (params?: ListParams) => this.gapList<HaloTicket>("tickets", "tickets", params),
    get: async (_id) => this.gap("tickets", "get"),
    create: async (input: HaloTicketCreate) => {
      const body = t.ticketCreateReq(input);
      const res = await this.http.request<GoreloCreateTicketResult>({
        method: "POST",
        path: "/v1/tickets",
        body,
        resource: "tickets",
        operation: "create",
      });
      return t.ticketCreateResp(res.data, input);
    },
    update: async (_input) => this.gap("tickets", "update"),
    delete: (_id) => this.gapVoid("tickets", "delete"),
  };

  // ---- actions ------------------------------------------------------------

  readonly actions: ActionBackend = {
    list: async (params?: ListParams) => this.gapList<HaloEntity>("actions", "actions", params),
    create: async (_input) => this.gap("actions", "create"),
  };

  // ---- clients ------------------------------------------------------------

  readonly clients: ClientBackend = {
    list: async (params?: ListParams) => {
      const res = await this.http.request<GoreloClientResponse[]>({
        method: "GET",
        path: "/v1/clients",
        resource: "clients",
        operation: "list",
      });
      return toHaloPage("clients", (res.data ?? []).map(t.clientResp), params);
    },
    get: async (id: number) => {
      const res = await this.http.request<GoreloClientResponse>({
        method: "GET",
        path: `/v1/clients/${id}`,
        resource: "clients",
        operation: "get",
      });
      return t.clientResp(res.data);
    },
    create: async (input: HaloClientCreate) => {
      const res = await this.http.request<GoreloClientResponse>({
        method: "POST",
        path: "/v1/clients",
        body: t.clientCreateReq(input),
        resource: "clients",
        operation: "create",
      });
      return t.clientResp(res.data);
    },
    update: async (input: HaloClientUpdate) => {
      const res = await this.http.request<GoreloClientResponse>({
        method: "PATCH",
        path: "/v1/clients",
        body: t.clientUpdateReq(input),
        resource: "clients",
        operation: "update",
      });
      return t.clientResp(res.data ?? ({ id: input.id } as GoreloClientResponse));
    },
    delete: (_id) => this.gapVoid("clients", "delete"),
  };

  // ---- sites (Gorelo client locations) -----------------------------------

  readonly sites: SiteBackend = {
    list: async (params?: ListParams) => {
      if (params?.client_id === undefined) {
        throw new ValidationError("sites.list requires client_id: Gorelo has no global location list", {
          provider: "gorelo",
          resource: "sites",
          operation: "list",
        });
      }
      const res = await this.http.request<GoreloLocationResponse[]>({
        method: "GET",
        path: `/v1/clients/${params.client_id}/locations`,
        resource: "sites",
        operation: "list",
      });
      return toHaloPage("sites", (res.data ?? []).map(t.locationResp), params);
    },
    get: async (_id) => this.gap("sites", "get"),
    create: async (_input) => this.gap("sites", "create"),
    update: async (_input) => this.gap("sites", "update"),
    delete: (_id) => this.gapVoid("sites", "delete"),
  };

  // ---- users / contacts ---------------------------------------------------

  readonly users: UserBackend = {
    list: async (params?: ListParams) => {
      const query: Record<string, string | number | undefined> = {};
      if (params?.client_id !== undefined) query["clientid"] = params.client_id;
      if (params?.ids?.length) query["ContactIds"] = params.ids.join(",");
      const res = await this.http.request<GoreloContactResponse[]>({
        method: "GET",
        path: "/v1/contacts",
        query,
        resource: "users",
        operation: "list",
      });
      return toHaloPage("users", (res.data ?? []).map(t.contactResp), params);
    },
    get: async (id: number) => {
      const res = await this.http.request<GoreloContactResponse>({
        method: "GET",
        path: `/v1/contacts/${id}`,
        resource: "users",
        operation: "get",
      });
      return t.contactResp(res.data);
    },
    create: async (input: HaloUserCreate) => {
      const res = await this.http.request<GoreloContactResponse>({
        method: "POST",
        path: "/v1/contacts",
        body: t.contactCreateReq(input),
        resource: "users",
        operation: "create",
      });
      return t.contactResp(res.data);
    },
    update: async (input: HaloUserUpdate) => {
      const res = await this.http.request<GoreloContactResponse>({
        method: "PATCH",
        path: "/v1/contacts",
        body: t.contactUpdateReq(input),
        resource: "users",
        operation: "update",
      });
      return t.contactResp(res.data ?? ({ id: input.id } as GoreloContactResponse));
    },
    delete: (_id) => this.gapVoid("users", "delete"),
  };

  // ---- assets -------------------------------------------------------------

  readonly assets: AssetBackend = {
    list: async (params?: ListParams) => {
      const res = await this.http.request<GoreloDeviceResponse[]>({
        method: "GET",
        path: "/v1/assets/agents",
        resource: "assets",
        operation: "list",
      });
      return toHaloPage("assets", (res.data ?? []).map(t.deviceResp), params);
    },
    get: async (id: number | string) => {
      const res = await this.http.request<GoreloDeviceResponse>({
        method: "GET",
        path: `/v1/assets/agents/${id}`,
        resource: "assets",
        operation: "get",
      });
      return t.deviceResp(res.data);
    },
    create: async (_input) => this.gap("assets", "create"),
    update: async (_input) => this.gap("assets", "update"),
    delete: (_id) => this.gapVoid("assets", "delete"),
  };

  // ---- lookups ------------------------------------------------------------

  private lookup<T>(
    resource: ResourceName,
    path: string,
    key: string,
    map: (g: T) => HaloLookup,
  ): LookupBackend {
    return {
      list: async (params?: PageParams) => {
        const res = await this.http.request<T[]>({
          method: "GET",
          path,
          resource,
          operation: "list",
        });
        return toHaloPage(key, (res.data ?? []).map(map), params);
      },
    };
  }

  readonly ticketStatuses: LookupBackend = this.lookup<GoreloStatusListItem>(
    "ticketStatuses",
    "/v1/tickets/statuses",
    "statuses",
    t.statusResp,
  );

  readonly ticketTypes: LookupBackend = this.lookup<GoreloTypeListItem>(
    "ticketTypes",
    "/v1/tickets/types",
    "types",
    t.typeResp,
  );

  readonly ticketTags: LookupBackend = this.lookup<GoreloTagListItem>(
    "ticketTags",
    "/v1/tickets/tags",
    "tags",
    t.tagResp,
  );

  // Undocumented schemas: pass through raw objects, best-effort id/name.
  readonly teams: LookupBackend = this.lookup<Record<string, unknown>>(
    "teams",
    "/v1/organization/groups",
    "teams",
    (g) => ({ ...g, id: Number(g["id"] ?? 0), name: (g["name"] as string) ?? undefined }),
  );

  readonly agents: LookupBackend = this.lookup<Record<string, unknown>>(
    "agents",
    "/v1/organization/users",
    "agents",
    (g) => ({ ...g, id: Number(g["id"] ?? 0), name: (g["name"] as string) ?? undefined }),
  );

  // ---- finance gaps -------------------------------------------------------

  readonly invoices: InvoiceBackend = {
    list: async (params?: ListParams) => this.gapList<HaloEntity>("invoices", "invoices", params),
    get: async (_id) => this.gap("invoices", "get"),
  };

  readonly contracts: ContractBackend = {
    list: async (params?: ListParams) => this.gapList<HaloEntity>("contracts", "contracts", params),
  };

  // ---- alerts (Gorelo-only) ----------------------------------------------

  readonly alerts: AlertBackend = {
    create: async (input: HaloAlertCreate) => {
      await this.http.request<unknown>({
        method: "POST",
        path: "/v1/alerts/",
        body: t.alertReq(input),
        resource: "alerts",
        operation: "create",
      });
      return { ok: true as const };
    },
  };
}

/** Assert the manifest and this backend's `IMPLEMENTED` set agree. Returns the
 * discrepancies (empty when consistent). Used by the CI gate. */
export function manifestImplementationDrift(): {
  implementedButNotSupported: OperationKey[];
  supportedButNotImplemented: OperationKey[];
} {
  const supported = new Set<OperationKey>(
    (Object.keys(goreloManifest) as OperationKey[]).filter((k) => isSupported(goreloManifest[k].status)),
  );
  const implemented = GoreloBackend.implementedOperations();
  return {
    implementedButNotSupported: [...implemented].filter((k) => !supported.has(k)),
    supportedButNotImplemented: [...supported].filter((k) => !implemented.has(k)),
  };
}
