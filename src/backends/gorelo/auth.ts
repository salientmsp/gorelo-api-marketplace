import type { GoreloAuth } from "../../config.js";

/** Gorelo auth is a single static `X-API-Key` header — no token exchange. */
export function goreloAuthHeaders(auth: GoreloAuth): () => Promise<Record<string, string>> {
  const headers = { "X-API-Key": auth.apiKey };
  return async () => headers;
}
