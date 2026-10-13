import "server-only";
import { one, query } from "@/lib/db";
import { apiGet, ns } from "./client";
import { blizzardConfig, credentialsConfigured, fillTemplate } from "./config";
import { BLIZZARD_SYNC_FLAG, getFlag, setFlag } from "../flags";
import { notify } from "../notify";

// Namespace probe: asks Battle.net whether a WoW: Forever namespace exists.
//
//  1. Control: a known-good Classic namespace must answer, otherwise the run is
//     an "error" (bad creds / API down) — never a false "no namespace yet".
//  2. Static: playable-class index under static-<tag>-<region> for each
//     candidate tag. A hit means game data is live (notify, keep sync dark).
//  3. Profile: fetch a real roster character under profile-<tag>-<region>
//     using each candidate realmless URL template. A hit = namespace detected:
//     the sync flag flips on, the discovered shape is saved, officers notified.

export type ProbeStatus = "no_namespace_yet" | "static_only" | "namespace_detected" | "unconfigured" | "error";

export type ProbeCheck = { label: string; namespace?: string; path?: string; httpStatus: number | null; ok: boolean };

export type ProbeReport = {
  status: ProbeStatus;
  namespaceDetected: boolean;
  message: string;
  ranAt: string;
  checks: ProbeCheck[];
  discovered?: ApiShape;
};

export type ApiShape = { tag: string; profilePathTemplate: string; region: string; detectedAt: string };

type Subject = { firstName: string; secondName: string; ruleset: string };

async function probeSubject(): Promise<Subject | null> {
  const env = blizzardConfig().probeCharacter;
  if (env) {
    // "First Second/ruleset" (ruleset optional, defaults to normal)
    const [name, ruleset = "normal"] = env.split("/");
    const [firstName, secondName] = name.trim().split(/[\s-]+/);
    if (firstName && secondName) return { firstName, secondName, ruleset };
  }
  return one<Subject>(
    `select first_name as "firstName", second_name as "secondName", ruleset from characters
     where status = 'active' order by is_main desc, created_at limit 1`,
  );
}

export async function lastProbeRun() {
  return one<{ status: ProbeStatus; ranAt: Date; detail: Partial<ProbeReport> }>(
    `select status, ran_at as "ranAt", detail from probe_runs order by ran_at desc limit 1`,
  );
}

export async function savedApiShape(): Promise<ApiShape | null> {
  const row = await one<{ value: ApiShape }>(`select value from guild_settings where key = 'blizzard_api'`);
  return row?.value ?? null;
}

const MESSAGES: Record<ProbeStatus, string> = {
  no_namespace_yet: "No WoW: Forever namespace yet. Sync stays dark.",
  static_only: "Forever game-data namespace is live, but no profile namespace confirmed yet. Sync stays dark.",
  namespace_detected: "Forever profile namespace detected — Blizzard sync enabled.",
  unconfigured:
    "No WoW: Forever namespace yet (live probe skipped: BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET not set). Sync stays dark.",
  error: "Probe could not reach the Battle.net API (control check failed). Status unknown; sync unchanged.",
};

export async function runProbe(): Promise<ProbeReport> {
  const cfg = blizzardConfig();
  const prev = await lastProbeRun();
  const checks: ProbeCheck[] = [];
  let status: ProbeStatus;
  let discovered: ApiShape | undefined;
  let errorDetail: string | undefined;

  if (!credentialsConfigured(cfg)) {
    status = "unconfigured";
  } else {
    try {
      const classIndex = "/data/wow/playable-class/index";
      const control = await apiGet(classIndex, ns("static", cfg.controlNamespaceTag, cfg), cfg);
      checks.push({ label: "control", namespace: ns("static", cfg.controlNamespaceTag, cfg), path: classIndex, httpStatus: control.status, ok: control.ok });
      if (!control.ok) {
        status = "error";
      } else {
        let staticTag: string | null = null;
        for (const tag of cfg.namespaceTags) {
          const r = await apiGet(classIndex, ns("static", tag, cfg), cfg);
          checks.push({ label: "static", namespace: ns("static", tag, cfg), path: classIndex, httpStatus: r.status, ok: r.ok });
          if (r.ok && !staticTag) staticTag = tag;
        }
        const subject = await probeSubject();
        if (subject) {
          const tags = staticTag ? [staticTag, ...cfg.namespaceTags.filter((t) => t !== staticTag)] : cfg.namespaceTags;
          outer: for (const tag of tags) {
            for (const tpl of cfg.profilePathTemplates) {
              const path = fillTemplate(tpl, subject);
              const r = await apiGet(path, ns("profile", tag, cfg), cfg);
              checks.push({ label: "profile", namespace: ns("profile", tag, cfg), path, httpStatus: r.status, ok: r.ok });
              if (r.ok) {
                discovered = { tag, profilePathTemplate: tpl, region: cfg.region, detectedAt: new Date().toISOString() };
                break outer;
              }
            }
          }
        } else {
          checks.push({ label: "profile", httpStatus: null, ok: false, path: "(skipped: no active roster character to test with)" });
        }
        status = discovered ? "namespace_detected" : staticTag ? "static_only" : "no_namespace_yet";
      }
    } catch (err) {
      status = "error";
      errorDetail = (err as Error).message;
    }
  }

  const report: ProbeReport = {
    status,
    namespaceDetected: status === "namespace_detected",
    message: errorDetail ? `${MESSAGES[status]} (${errorDetail})` : MESSAGES[status],
    ranAt: new Date().toISOString(),
    checks,
    discovered,
  };

  await query(`insert into probe_runs (status, detail) values ($1, $2::jsonb)`, [status, JSON.stringify(report)]);

  if (discovered) {
    await query(
      `insert into guild_settings (key, value, updated_at) values ('blizzard_api', $1::jsonb, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [JSON.stringify(discovered)],
    );
    const flag = await getFlag(BLIZZARD_SYNC_FLAG);
    if (!flag?.enabled) {
      await setFlag(BLIZZARD_SYNC_FLAG, true, "probe", `Enabled by probe: profile-${discovered.tag}-${discovered.region}`);
    }
  }
  if (prev?.status !== status && (status === "namespace_detected" || status === "static_only")) {
    await notify(
      status === "namespace_detected" ? "Blizzard API is live for Forever" : "Forever game data API spotted",
      status === "namespace_detected"
        ? `Profile namespace profile-${discovered!.tag}-${discovered!.region} answered. Character sync is now on.`
        : "A Forever static namespace answered. Profiles aren't confirmed yet; sync stays off until they are.",
    );
  }
  return report;
}
