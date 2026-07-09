/**
 * HaloClient — the public surface. Mirrors Halo's REST resources as method
 * namespaces and delegates to a swappable {@link Backend}. Existing Halo
 * integrations can repoint by changing only the `provider` in config.
 */

import type {
  ActionBackend,
  AlertBackend,
  AssetBackend,
  Backend,
  ClientBackend,
  ContractBackend,
  InvoiceBackend,
  LookupBackend,
  SiteBackend,
  TicketBackend,
  UserBackend,
} from "./backend.js";
import type { ClientConfig, ResolvedConfig } from "./config.js";
import { defaultRetry, realTimers } from "./config.js";
import { ValidationError } from "./errors.js";
import { noopLogger } from "./logger.js";
import { GoreloBackend } from "./backends/gorelo/gorelo-backend.js";
import { HaloBackend } from "./backends/halo/halo-backend.js";
import { goreloManifest } from "./manifest/manifest.js";
import type { ManifestEntry, OperationName, ResourceName } from "./manifest/types.js";
import { isSupported, opKey } from "./manifest/types.js";

function resolveConfig(config: ClientConfig): ResolvedConfig {
  if (!config.baseUrl) throw new ValidationError("baseUrl is required", { provider: config.provider });
  const globalFetch = config.fetch ?? (globalThis.fetch as typeof fetch | undefined);
  if (!globalFetch) {
    throw new ValidationError("No fetch implementation available; pass config.fetch", { provider: config.provider });
  }
  return {
    provider: config.provider,
    auth: config.auth,
    baseUrl: config.baseUrl,
    mode: config.mode ?? "throw",
    timeoutMs: config.timeoutMs ?? 30_000,
    retry: { ...defaultRetry, ...config.retry },
    logger: config.logger ?? noopLogger,
    fetch: globalFetch,
    timers: config.timers ?? realTimers,
  };
}

function buildBackend(cfg: ResolvedConfig): Backend {
  switch (cfg.provider) {
    case "halo":
      return new HaloBackend(cfg);
    case "gorelo":
      return new GoreloBackend(cfg);
    default: {
      const never: never = cfg.provider;
      throw new ValidationError(`Unknown provider: ${String(never)}`, { provider: cfg.provider });
    }
  }
}

export class HaloClient {
  readonly provider: "halo" | "gorelo";
  private readonly backend: Backend;

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

  constructor(config: ClientConfig) {
    const cfg = resolveConfig(config);
    this.provider = cfg.provider;
    this.backend = buildBackend(cfg);

    this.tickets = this.backend.tickets;
    this.actions = this.backend.actions;
    this.clients = this.backend.clients;
    this.sites = this.backend.sites;
    this.users = this.backend.users;
    this.assets = this.backend.assets;
    this.ticketStatuses = this.backend.ticketStatuses;
    this.ticketTypes = this.backend.ticketTypes;
    this.ticketTags = this.backend.ticketTags;
    this.teams = this.backend.teams;
    this.agents = this.backend.agents;
    this.invoices = this.backend.invoices;
    this.contracts = this.backend.contracts;
    this.alerts = this.backend.alerts;
  }

  /**
   * Inspect the capability of an operation on the current provider. For Halo
   * everything is `full` (faithful passthrough); for Gorelo it reflects the
   * manifest. Returns `undefined` for keys not in the manifest.
   */
  capability(resource: ResourceName, operation: OperationName): ManifestEntry | undefined {
    if (this.provider === "halo") {
      return {
        resource,
        operation,
        status: "full",
        goreloRef: null,
        fieldMap: [],
        unsupportedParams: [],
        caveats: ["Halo passthrough."],
      };
    }
    return goreloManifest[opKey(resource, operation)];
  }

  /** True when the operation is servable on the current provider. */
  can(resource: ResourceName, operation: OperationName): boolean {
    const cap = this.capability(resource, operation);
    return cap ? isSupported(cap.status) : false;
  }
}
