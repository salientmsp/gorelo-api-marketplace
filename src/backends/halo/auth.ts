/**
 * Halo OAuth2 client-credentials token manager. Caches the bearer token and
 * refreshes it just before expiry. A single in-flight refresh is shared so
 * concurrent requests don't stampede the auth server.
 */

import type { HaloAuth, ResolvedConfig } from "../../config.js";
import { AuthError } from "../../errors.js";

interface TokenState {
  accessToken: string;
  /** epoch ms when the token should be considered expired. */
  expiresAt: number;
}

interface HaloTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

/** Refresh this many ms before the real expiry to avoid edge races. */
const EXPIRY_SKEW_MS = 30_000;

export class HaloTokenManager {
  private readonly auth: HaloAuth;
  private readonly cfg: ResolvedConfig;
  private state: TokenState | undefined;
  private inflight: Promise<TokenState> | undefined;

  constructor(auth: HaloAuth, cfg: ResolvedConfig) {
    this.auth = auth;
    this.cfg = cfg;
  }

  headers = async (): Promise<Record<string, string>> => {
    const token = await this.token();
    return { authorization: `Bearer ${token}` };
  };

  private async token(): Promise<string> {
    const now = this.cfg.timers.now();
    if (this.state && this.state.expiresAt > now) return this.state.accessToken;
    if (!this.inflight) {
      this.inflight = this.fetchToken().finally(() => {
        this.inflight = undefined;
      });
    }
    this.state = await this.inflight;
    return this.state.accessToken;
  }

  private async fetchToken(): Promise<TokenState> {
    const url = `${this.auth.authUrl.replace(/\/+$/, "")}/token`;
    const form = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.auth.clientId,
      client_secret: this.auth.clientSecret,
      scope: this.auth.scope ?? "all",
    });
    const res = await this.cfg.fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: form.toString(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new AuthError(`Halo token request failed: ${res.status} ${text.slice(0, 300)}`, {
        provider: "halo",
        httpStatus: res.status,
      });
    }
    const json = (await res.json()) as HaloTokenResponse;
    if (!json.access_token) {
      throw new AuthError("Halo token response missing access_token", { provider: "halo" });
    }
    const ttl = (json.expires_in ?? 3600) * 1000;
    return {
      accessToken: json.access_token,
      expiresAt: this.cfg.timers.now() + Math.max(0, ttl - EXPIRY_SKEW_MS),
    };
  }
}
