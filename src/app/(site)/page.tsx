import Link from "next/link";
import { LAUNCH_DATE, RAID_UNLOCK_DATE, ROLE_LABELS } from "@/config/guild";
import { isWriter } from "@/lib/auth";
import { listAnnouncements } from "@/lib/data/announcements";
import { listEvents } from "@/lib/data/events";
import { getSceneData } from "@/lib/scene/data";
import { createAnnouncementAction } from "@/lib/actions/misc";
import { daysUntil, fmtShortDate } from "@/lib/time";
import { AnnouncementCard } from "@/components/announcement-card";
import { EventRow } from "@/components/event-row";
import { ActionForm, Submit } from "@/components/forms";
import { HomeHero } from "@/components/home-hero";
import { IconArrowRight, IconPlus, ROLE_ICONS } from "@/components/icons";
import { RavenMark } from "@/components/raven";
import { HomeScene } from "@/components/scene/HomeScene";
import { RaidCards, SkyHover } from "@/components/sky-links";

function Heading({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="display flex items-center gap-2 text-2xl text-ink">
        <RavenMark size={22} />
        {children}
      </h2>
      {aside && <div className="text-sm text-ink-dim">{aside}</div>}
    </div>
  );
}

export default async function HomePage() {
  const [writer, news, upcoming, sky] = await Promise.all([
    isWriter(),
    listAnnouncements(10),
    listEvents("upcoming", 4),
    getSceneData(),
  ]);
  const mains = sky.characters.filter((c) => c.isMain);

  return (
    <>
      <HomeScene data={sky} />
      <div className="relative z-10 flex flex-col gap-14 sm:gap-20">
        <HomeHero
          countdowns={[
            { label: "launch", days: daysUntil(LAUNCH_DATE), date: fmtShortDate(`${LAUNCH_DATE}T17:00:00Z`) },
            { label: "first raids", days: daysUntil(RAID_UNLOCK_DATE), date: fmtShortDate(`${RAID_UNLOCK_DATE}T17:00:00Z`) },
          ]}
        />

        <section>
          <Heading
            aside={
              <Link href="/progression" className="flex min-h-11 items-center gap-1 hover:text-gold-bright">
                Progression <IconArrowRight size={14} />
              </Link>
            }
          >
            The raids
          </Heading>
          <RaidCards raids={sky.raids} />
        </section>

        <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
          <section>
            <Heading
              aside={
                <Link href="/events" className="flex min-h-11 items-center gap-1 hover:text-gold-bright">
                  Calendar <IconArrowRight size={14} />
                </Link>
              }
            >
              Next up
            </Heading>
            <div className="flex flex-col gap-2">
              {upcoming.length === 0 && (
                <div className="glass rounded-2xl p-5 text-sm text-ink-dim" data-solid>
                  Nothing scheduled yet.{" "}
                  {writer && (
                    <Link href="/events/new" className="text-gold hover:underline">
                      Create the first raid night
                    </Link>
                  )}
                </div>
              )}
              {upcoming.map((e) => (
                <SkyHover key={e.id} id={e.raidId ? `raid:${e.raidId}` : null}>
                  <EventRow e={e} />
                </SkyHover>
              ))}
            </div>
          </section>

          <section>
            <Heading
              aside={
                <Link href="/roster" className="flex min-h-11 items-center gap-1 hover:text-gold-bright">
                  Roster <IconArrowRight size={14} />
                </Link>
              }
            >
              The crew
            </Heading>
            <div className="glass rounded-2xl p-4" data-solid>
              {sky.characters.length === 0 ? (
                <p className="text-sm text-ink-dim">
                  No one&apos;s on the roster yet.{" "}
                  {writer && (
                    <Link href="/roster/new" className="text-gold hover:underline">
                      Add the first character
                    </Link>
                  )}
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {sky.characters.map((c) => {
                    const I = ROLE_ICONS[c.role];
                    return (
                      <li key={c.id}>
                        <SkyHover id={`char:${c.id}`}>
                          <Link
                            href={c.path}
                            className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-bg/60 px-3.5 text-sm transition-colors hover:border-line-strong"
                            title={`${c.className} · ${ROLE_LABELS[c.role]}`}
                          >
                            <span className="size-1.5 rounded-full" style={{ background: c.color, boxShadow: `0 0 8px ${c.color}` }} />
                            <span className="font-semibold" style={{ color: c.color }}>
                              {c.name}
                            </span>
                            <I size={13} className="text-muted" />
                          </Link>
                        </SkyHover>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted">
                {mains.length} main{mains.length === 1 ? "" : "s"} · {sky.characters.length - mains.length} alt
                {sky.characters.length - mains.length === 1 ? "" : "s"} · {sky.characters.filter((c) => c.planned).length} planned
              </p>
            </div>
          </section>
        </div>

        <section className="max-w-3xl">
          <Heading>Guild news</Heading>
          <div className="flex flex-col gap-3">
            {news.map((a) => (
              <AnnouncementCard key={a.id} a={a} writer={writer} />
            ))}
            {writer && (
              <details className="card p-0" data-solid>
                <summary className="flex min-h-11 items-center gap-2 px-5 py-3 text-sm font-semibold text-gold">
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
      </div>
    </>
  );
}
