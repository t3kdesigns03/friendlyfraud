import Link from "next/link";
import { GUILD_NAME, GUILD_TAGLINE, LAUNCH_DATE, RAID_UNLOCK_DATE } from "@/config/guild";
import { isWriter } from "@/lib/auth";
import { listAnnouncements } from "@/lib/data/announcements";
import { listEvents } from "@/lib/data/events";
import { getProgression } from "@/lib/data/progression";
import { listCharacters } from "@/lib/data/roster";
import { createAnnouncementAction } from "@/lib/actions/misc";
import { daysUntil, fmtDateLong } from "@/lib/time";
import { AnnouncementCard } from "@/components/announcement-card";
import { EventRow } from "@/components/event-row";
import { ActionForm, Submit } from "@/components/forms";
import { IconArrowRight, IconCross, IconPlus, IconShield, IconSword } from "@/components/icons";
import { Empty, SectionTitle } from "@/components/ui";

function Countdown({ label, date }: { label: string; date: string }) {
  const days = daysUntil(date);
  return (
    <div className="flex items-baseline gap-2 rounded-xl border border-line bg-surface/60 px-4 py-3">
      <span className="num text-2xl text-gold-bright">{days > 0 ? days : "Live"}</span>
      <span className="text-xs leading-tight text-ink-dim">
        {days > 0 ? (days === 1 ? "day until" : "days until") : ""} <span className="text-ink">{label}</span>
        <br />
        <span className="text-muted">{fmtDateLong(`${date}T17:00:00Z`)}</span>
      </span>
    </div>
  );
}

export default async function HomePage() {
  const [writer, news, upcoming, progression, roster] = await Promise.all([
    isWriter(),
    listAnnouncements(10),
    listEvents("upcoming", 4),
    getProgression(),
    listCharacters(),
  ]);
  const active = roster.filter((c) => c.status !== "inactive");
  const mains = active.filter((c) => c.isMain);
  const roleCount = (r: string) => mains.filter((c) => c.role === r).length;

  return (
    <div className="flex flex-col gap-12">
      <section className="relative pt-2 sm:pt-6">
        <div className="eyebrow mb-3">{GUILD_TAGLINE}</div>
        <h1 className="display text-5xl leading-[0.95] text-ink sm:text-7xl">{GUILD_NAME}</h1>
        <div className="rule-gold mt-6 max-w-md" />
        <div className="mt-6 flex flex-wrap gap-3">
          <Countdown label="launch" date={LAUNCH_DATE} />
          <Countdown label="first raids" date={RAID_UNLOCK_DATE} />
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <section>
          <SectionTitle>Guild news</SectionTitle>
          <div className="flex flex-col gap-3">
            {news.length === 0 && <Empty title="Quiet in here">No announcements yet.</Empty>}
            {news.map((a) => (
              <AnnouncementCard key={a.id} a={a} writer={writer} />
            ))}
            {writer && (
              <details className="card group p-0">
                <summary className="flex items-center gap-2 px-5 py-4 text-sm font-semibold text-gold">
                  <IconPlus size={16} /> Post an announcement
                </summary>
                <ActionForm action={createAnnouncementAction} resetOnSuccess className="flex flex-col gap-3 px-5 pb-5">
                  <div className="field">
                    <label className="label" htmlFor="a-title">
                      Title
                    </label>
                    <input id="a-title" name="title" className="input" required maxLength={120} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="a-body">
                      Message
                    </label>
                    <textarea id="a-body" name="body" className="input" rows={4} />
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="field flex-1">
                      <label className="label" htmlFor="a-author">
                        Signed
                      </label>
                      <input id="a-author" name="author" className="input" placeholder="Officers" maxLength={40} />
                    </div>
                    <label className="flex h-11 items-center gap-2 text-sm text-ink-dim">
                      <input type="checkbox" name="pinned" defaultChecked className="accent-[var(--gold)]" /> Pin it
                    </label>
                    <Submit pendingText="Posting…">Post</Submit>
                  </div>
                </ActionForm>
              </details>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-10">
          <section>
            <SectionTitle
              aside={
                <Link href="/events" className="flex items-center gap-1 hover:text-gold-bright">
                  Calendar <IconArrowRight size={14} />
                </Link>
              }
            >
              Next up
            </SectionTitle>
            <div className="flex flex-col gap-2">
              {upcoming.length === 0 && (
                <Empty title="Nothing scheduled">
                  {writer ? (
                    <Link href="/events/new" className="text-gold hover:underline">
                      Create the first event
                    </Link>
                  ) : (
                    "Officers haven't posted events yet."
                  )}
                </Empty>
              )}
              {upcoming.map((e) => (
                <EventRow key={e.id} e={e} />
              ))}
            </div>
          </section>

          <section>
            <SectionTitle
              aside={
                <Link href="/progression" className="flex items-center gap-1 hover:text-gold-bright">
                  Details <IconArrowRight size={14} />
                </Link>
              }
            >
              Progression
            </SectionTitle>
            <div className="card divide-y divide-line">
              {progression.map((r) => {
                const killed = r.bosses.filter((b) => b.kills > 0).length;
                const total = r.bosses.length;
                return (
                  <div key={r.id} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-ink">{r.name}</span>
                      <span className="num text-sm text-ink-dim">
                        <span className={killed && killed === total ? "text-gold-bright" : ""}>{killed}</span>/{total || "?"}
                      </span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold-bright"
                        style={{ width: total ? `${(killed / total) * 100}%` : "0%" }}
                      />
                    </div>
                    <div className="mt-1.5 text-[11px] text-muted">{r.size}-player</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <SectionTitle
              aside={
                <Link href="/roster" className="flex items-center gap-1 hover:text-gold-bright">
                  Roster <IconArrowRight size={14} />
                </Link>
              }
            >
              The crew
            </SectionTitle>
            <div className="card grid grid-cols-3 divide-x divide-line text-center">
              {(
                [
                  ["tank", "Tanks", IconShield],
                  ["healer", "Healers", IconCross],
                  ["dps", "DPS", IconSword],
                ] as const
              ).map(([r, label, I]) => (
                <div key={r} className="py-4">
                  <I size={16} className="mx-auto text-ink-dim" />
                  <div className="num mt-1 text-2xl text-ink">{roleCount(r)}</div>
                  <div className="text-[11px] uppercase tracking-widest text-muted">{label}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {mains.length} main{mains.length === 1 ? "" : "s"} · {active.length - mains.length} alt
              {active.length - mains.length === 1 ? "" : "s"} · {active.filter((c) => c.status === "planned").length}{" "}
              planned
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
