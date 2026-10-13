import { redirect } from "next/navigation";
import { FEATURES, GUILD_NAME, GUILD_TIMEZONE, RULESET_LABELS, RULESETS } from "@/config/guild";
import { isWriter } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDkpSettings } from "@/lib/data/settings";
import { getApiStatus } from "@/api";
import { saveDkpSettingsAction } from "@/lib/actions/loot";
import { importRosterAction, runProbeAction, setSyncFlagAction, syncAllAction } from "@/lib/actions/misc";
import { fmtShortDate, fmtTime } from "@/lib/time";
import { ActionForm, Submit } from "@/components/forms";
import { PageHeader, SectionTitle } from "@/components/ui";

export const metadata = { title: "Settings" };

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  no_namespace_yet: { label: "No namespace yet", tone: "text-ink-dim border-line-strong" },
  static_only: { label: "Game data only", tone: "text-maybe border-maybe/40" },
  namespace_detected: { label: "Namespace live", tone: "text-yes border-yes/40" },
  error: { label: "Probe error", tone: "text-no border-no/40" },
};

export default async function SettingsPage() {
  if (!(await isWriter())) redirect("/login?next=/settings");
  const [dkp, api, database] = await Promise.all([getDkpSettings(), getApiStatus(), db()]);
  const s = STATUS_LABEL[api.status] ?? STATUS_LABEL.no_namespace_yet;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Officers" title="Settings" />

      {FEATURES.loot && (
      <section className="mb-10">
        <SectionTitle>DKP</SectionTitle>
        <ActionForm action={saveDkpSettingsAction} className="card grid gap-4 p-5 sm:grid-cols-3">
          <div className="field">
            <label className="label" htmlFor="startingBalance">
              Starting DKP
            </label>
            <input id="startingBalance" name="startingBalance" type="number" min={0} className="input" defaultValue={dkp.startingBalance} />
            <p className="hint">Granted when a character is added.</p>
          </div>
          <div className="field">
            <label className="label" htmlFor="attendanceAward">
              Per raid attended
            </label>
            <input id="attendanceAward" name="attendanceAward" type="number" min={0} className="input" defaultValue={dkp.attendanceAward} />
            <p className="hint">Here, Late and Bench earn it.</p>
          </div>
          <div className="field">
            <label className="label" htmlFor="decayPercent">
              Decay %
            </label>
            <input id="decayPercent" name="decayPercent" type="number" min={0} max={100} className="input" defaultValue={dkp.decayPercent} />
            <p className="hint">Applied manually from the Loot page.</p>
          </div>
          <div className="flex justify-end sm:col-span-3">
            <Submit>Save DKP settings</Submit>
          </div>
        </ActionForm>
      </section>
      )}

      <section className="mb-10">
        <SectionTitle>Blizzard API</SectionTitle>
        <div className="card flex flex-col gap-5 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`chip h-7 ${s.tone}`}>{s.label}</span>
            <span className={`chip h-7 ${api.syncEnabled ? "text-yes border-yes/40" : ""}`}>
              Sync {api.syncEnabled ? "on" : "dark"}
            </span>
            {api.killSwitch && <span className="chip h-7 text-no border-no/40">Kill switch set</span>}
            {!api.probeConfigured && <span className="chip h-7">No Battle.net credentials</span>}
          </div>
          <p className="text-sm text-ink-dim">{api.message}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-muted">Last checked</dt>
            <dd className="text-ink">
              {api.lastCheckedAt ? `${fmtShortDate(api.lastCheckedAt)} ${fmtTime(api.lastCheckedAt)}` : "Never on this deployment"}
            </dd>
            <dt className="text-muted">Flag</dt>
            <dd className="text-ink">
              {api.flag.enabled ? "enabled" : "disabled"} <span className="text-muted">({api.flag.source ?? "default"})</span>
            </dd>
            {api.discovered && (
              <>
                <dt className="text-muted">Discovered</dt>
                <dd className="num text-ink">
                  profile-{api.discovered.tag}-{api.discovered.region} · {api.discovered.profilePathTemplate}
                </dd>
              </>
            )}
            <dt className="text-muted">Endpoint</dt>
            <dd className="num text-ink-dim">GET /api/probe</dd>
          </dl>
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <ActionForm action={runProbeAction}>
              <Submit className="btn" pendingText="Probing…">
                Run probe now
              </Submit>
            </ActionForm>
            <ActionForm action={setSyncFlagAction} confirm={api.flag.enabled ? undefined : "Force sync on without a detected namespace? Calls will fail until Blizzard ships the API."}>
              <input type="hidden" name="enabled" value={api.flag.enabled ? "false" : "true"} />
              <Submit className="btn btn-ghost">{api.flag.enabled ? "Turn sync off" : "Force sync on"}</Submit>
            </ActionForm>
            {api.syncEnabled && (
              <ActionForm action={syncAllAction}>
                <Submit className="btn" pendingText="Syncing…">
                  Sync all characters
                </Submit>
              </ActionForm>
            )}
          </div>
          {api.syncEnabled && (
            <ActionForm action={importRosterAction} className="grid gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_auto_auto]">
              <input name="guildSlug" className="input" placeholder={GUILD_NAME.toLowerCase().replace(/\s+/g, "-")} aria-label="Guild slug" required />
              <select name="ruleset" className="input" aria-label="Ruleset" defaultValue="normal">
                {RULESETS.map((r) => (
                  <option key={r} value={r}>
                    {RULESET_LABELS[r]}
                  </option>
                ))}
              </select>
              <Submit className="btn">Import guild roster</Submit>
            </ActionForm>
          )}
        </div>
      </section>

      <section>
        <SectionTitle>About this deployment</SectionTitle>
        <dl className="card grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 p-5 text-sm">
          <dt className="text-muted">Guild</dt>
          <dd>{GUILD_NAME}</dd>
          <dt className="text-muted">Guild time</dt>
          <dd>{GUILD_TIMEZONE}</dd>
          <dt className="text-muted">Database</dt>
          <dd>{database.mode === "supabase" ? "Supabase Postgres" : "Embedded local database (.data/) — dev only"}</dd>
        </dl>
      </section>
    </div>
  );
}
