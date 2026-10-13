import "server-only";
import { one, query } from "@/lib/db";
import { blizzardConfig } from "./blizzard/config";

// Runtime feature flags live in the database so the probe can turn sync on
// without a rebuild or redeploy.

export const BLIZZARD_SYNC_FLAG = "blizzard_sync";

export type FlagState = { key: string; enabled: boolean; source: string | null; note: string | null; updatedAt: Date };

export async function getFlag(key: string): Promise<FlagState | null> {
  return one<FlagState>(
    `select key, enabled, source, note, updated_at as "updatedAt" from feature_flags where key = $1`,
    [key],
  );
}

export async function setFlag(key: string, enabled: boolean, source: "probe" | "manual" | "default", note?: string) {
  await query(
    `insert into feature_flags (key, enabled, source, note, updated_at) values ($1, $2, $3, $4, now())
     on conflict (key) do update set enabled = excluded.enabled, source = excluded.source,
       note = coalesce(excluded.note, feature_flags.note), updated_at = now()`,
    [key, enabled, source, note ?? null],
  );
}

/** True only when the probe (or an officer) enabled sync and the env kill switch is off. */
export async function isBlizzardSyncEnabled(): Promise<boolean> {
  if (blizzardConfig().killSwitch) return false;
  return (await getFlag(BLIZZARD_SYNC_FLAG))?.enabled ?? false;
}
