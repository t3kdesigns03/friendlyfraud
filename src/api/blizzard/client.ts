import "server-only";
import { blizzardConfig, credentialsConfigured, type BlizzardConfig } from "./config";

// Thin Battle.net client: client-credentials token (cached) + GET helper.

let cached: { token: string; expiresAt: number } | null = null;

export async function getToken(cfg: BlizzardConfig = blizzardConfig()): Promise<string> {
  if (!credentialsConfigured(cfg)) throw new Error("BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET not set");
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Battle.net token request failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

export type ApiResult<T = unknown> = { ok: boolean; status: number; url: string; data?: T };

export async function apiGet<T = unknown>(
  path: string,
  namespace: string,
  cfg: BlizzardConfig = blizzardConfig(),
): Promise<ApiResult<T>> {
  const token = await getToken(cfg);
  const url = `${cfg.apiBase.replace("{region}", cfg.region)}${path}${path.includes("?") ? "&" : "?"}namespace=${encodeURIComponent(namespace)}&locale=en_US`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = res.ok ? ((await res.json()) as T) : undefined;
  return { ok: res.ok, status: res.status, url: url.replace(/access_token=[^&]+/, ""), data };
}

export function ns(kind: "static" | "dynamic" | "profile", tag: string, cfg: BlizzardConfig = blizzardConfig()) {
  return `${kind}-${tag}-${cfg.region}`;
}
