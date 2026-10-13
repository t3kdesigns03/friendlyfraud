import "server-only";

// Public surface of the Blizzard API module. The rest of the app imports from
// "@/api" only (enforced by ESLint); everything under ./blizzard is private.
// Every sync entry point checks the runtime flag, so the module is inert until
// the namespace probe goes green.

import { isBlizzardSyncEnabled, getFlag, setFlag, BLIZZARD_SYNC_FLAG } from "./flags";
import { blizzardConfig, credentialsConfigured } from "./blizzard/config";
import { lastProbeRun, runProbe, savedApiShape, type ProbeReport, type ProbeStatus } from "./blizzard/probe";
import { importGuildRoster as importRoster, syncAllCharacters, syncCharacterById } from "./blizzard/sync";
import type { Ruleset } from "@/config/guild";

export { runProbe, isBlizzardSyncEnabled };
export type { ProbeReport, ProbeStatus };

const DARK = { dark: true as const, reason: "blizzard_sync_disabled" as const };

export async function syncCharacter(id: string) {
  if (!(await isBlizzardSyncEnabled())) return DARK;
  return syncCharacterById(id);
}

export async function syncAll() {
  if (!(await isBlizzardSyncEnabled())) return DARK;
  return { results: await syncAllCharacters() };
}

export async function importGuildRoster(guildSlug: string, ruleset: Ruleset) {
  if (!(await isBlizzardSyncEnabled())) return DARK;
  return importRoster(guildSlug, ruleset);
}

/** Officer override (Settings page). The probe can still turn it on later. */
export async function setBlizzardSync(enabled: boolean) {
  await setFlag(BLIZZARD_SYNC_FLAG, enabled, "manual", enabled ? "Enabled manually" : "Disabled manually");
}

export type ApiStatus = {
  status: ProbeStatus;
  namespaceDetected: boolean;
  syncEnabled: boolean;
  probeConfigured: boolean;
  killSwitch: boolean;
  lastCheckedAt: string | null;
  message: string;
  flag: { enabled: boolean; source: string | null; note: string | null; updatedAt: string | null };
  discovered: Awaited<ReturnType<typeof savedApiShape>>;
};

/** Read-only status (no network). Never-run reads as "no_namespace_yet". */
export async function getApiStatus(): Promise<ApiStatus> {
  const [last, flag, shape, syncEnabled] = await Promise.all([
    lastProbeRun(),
    getFlag(BLIZZARD_SYNC_FLAG),
    savedApiShape(),
    isBlizzardSyncEnabled(),
  ]);
  const status: ProbeStatus = shape ? "namespace_detected" : (last?.status ?? "no_namespace_yet");
  const cfg = blizzardConfig();
  return {
    status: status === "unconfigured" ? "no_namespace_yet" : status,
    namespaceDetected: Boolean(shape),
    syncEnabled,
    probeConfigured: credentialsConfigured(cfg),
    killSwitch: cfg.killSwitch,
    lastCheckedAt: last ? new Date(last.ranAt).toISOString() : null,
    message:
      last?.detail?.message ??
      "No WoW: Forever namespace yet. The probe hasn't run on this deployment; sync stays dark.",
    flag: {
      enabled: flag?.enabled ?? false,
      source: flag?.source ?? null,
      note: flag?.note ?? null,
      updatedAt: flag?.updatedAt ? new Date(flag.updatedAt).toISOString() : null,
    },
    discovered: shape,
  };
}
