import { isWriter } from "@/lib/auth";
import { getProgression } from "@/lib/data/progression";
import { eventOptions } from "@/lib/data/events";
import {
  addBossAction,
  deleteBossAction,
  moveBossAction,
  recordKillAction,
  renameBossAction,
  undoKillAction,
} from "@/lib/actions/progression";
import { daysUntil, fmtDateLong, fmtShortDate, toLocalInput } from "@/lib/time";
import { ActionForm, Submit } from "@/components/forms";
import { IconCheck, IconSkull } from "@/components/icons";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Progression" };

export default async function ProgressionPage() {
  const [writer, raids] = await Promise.all([isWriter(), getProgression()]);
  const events = writer ? await eventOptions(20) : [];
  const now = toLocalInput(new Date());

  return (
    <>
      <PageHeader
        eyebrow="Progression"
        title="Launch raids"
        sub="Barrow Deeps, Hyjal Summit and Onyxia's Lair unlock December 9. Boss lists for the new raids fill in as Blizzard reveals them."
      />
      <div className="flex flex-col gap-6">
        {raids.map((r) => {
          const killed = r.bosses.filter((b) => b.kills > 0).length;
          const total = r.bosses.length;
          const cleared = total > 0 && killed === total;
          const until = r.unlockDate ? daysUntil(r.unlockDate) : 0;
          return (
            <section key={r.id} className={`card overflow-hidden ${cleared ? "border-gold-dim" : ""}`}>
              <div className="relative flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="eyebrow mb-1.5">
                    {r.size}-player
                    {r.unlockDate && (until > 0 ? ` · unlocks in ${until} days` : ` · open since ${fmtShortDate(`${r.unlockDate}T17:00:00Z`)}`)}
                  </div>
                  <h2 className="display text-3xl text-ink">{r.name}</h2>
                  {r.description && <p className="mt-1 text-sm text-ink-dim">{r.description}</p>}
                </div>
                <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                  <div className="num text-3xl">
                    <span className={cleared ? "text-gold-bright" : "text-ink"}>{killed}</span>
                    <span className="text-muted">/{total || "?"}</span>
                  </div>
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold-bright"
                      style={{ width: total ? `${(killed / total) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>

              {total === 0 ? (
                <p className="px-5 py-6 text-sm text-ink-dim">
                  Encounters not announced yet.{writer ? " Add bosses below as they're revealed." : ""}
                </p>
              ) : (
                <ol className="divide-y divide-line">
                  {r.bosses.map((b, i) => (
                    <li key={b.id} className="px-5 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                              b.kills ? "border-gold-dim bg-gold/10 text-gold-bright" : "border-line text-muted"
                            }`}
                          >
                            {b.kills ? <IconCheck size={16} /> : <span className="num text-xs">{i + 1}</span>}
                          </span>
                          <div className="min-w-0">
                            <div className={`truncate font-semibold ${b.kills ? "text-ink" : "text-ink-dim"}`}>{b.name}</div>
                            <div className="text-xs text-muted">
                              {b.firstKillAt
                                ? `First kill ${fmtDateLong(b.firstKillAt)}${b.kills > 1 ? ` · ${b.kills} kills` : ""}`
                                : "Not yet killed"}
                            </div>
                          </div>
                        </div>
                        {writer && (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <ActionForm action={recordKillAction}>
                              <input type="hidden" name="bossId" value={b.id} />
                              <Submit className="btn btn-sm" pendingText="…">
                                <IconSkull size={14} /> Kill
                              </Submit>
                            </ActionForm>
                            {b.kills > 0 && (
                              <ActionForm action={undoKillAction} confirm="Remove the most recent kill?">
                                <input type="hidden" name="bossId" value={b.id} />
                                <Submit className="btn btn-ghost btn-sm" pendingText="…">
                                  Undo
                                </Submit>
                              </ActionForm>
                            )}
                          </div>
                        )}
                      </div>
                      {writer && (
                        <details className="mt-2 pl-11">
                          <summary className="text-xs text-muted hover:text-ink-dim">More…</summary>
                          <div className="mt-3 flex flex-col gap-3">
                            <ActionForm action={recordKillAction} className="grid gap-2 sm:grid-cols-[auto_1fr_1fr_auto]">
                              <input type="hidden" name="bossId" value={b.id} />
                              <input name="killedAt" type="datetime-local" className="input" defaultValue={now} aria-label="Kill time" />
                              <select name="eventId" className="input" defaultValue="" aria-label="Event">
                                <option value="">No event</option>
                                {events.map((e) => (
                                  <option key={e.id} value={e.id}>
                                    {e.title} · {fmtShortDate(e.startsAt)}
                                  </option>
                                ))}
                              </select>
                              <input name="note" className="input" placeholder="Note" maxLength={200} aria-label="Note" />
                              <Submit className="btn">Log kill</Submit>
                            </ActionForm>
                            <div className="flex flex-wrap items-center gap-2">
                              <ActionForm action={renameBossAction} className="flex gap-2">
                                <input type="hidden" name="id" value={b.id} />
                                <input name="name" className="input !min-h-8 !py-1 text-sm" defaultValue={b.name} aria-label="Boss name" />
                                <Submit className="btn btn-sm">Rename</Submit>
                              </ActionForm>
                              <ActionForm action={moveBossAction}>
                                <input type="hidden" name="id" value={b.id} />
                                <Submit className="btn btn-ghost btn-sm" name="dir" value="up" pendingText="…">
                                  ↑
                                </Submit>
                                <Submit className="btn btn-ghost btn-sm" name="dir" value="down" pendingText="…">
                                  ↓
                                </Submit>
                              </ActionForm>
                              <ActionForm action={deleteBossAction} confirm={`Delete ${b.name} and its kill history?`}>
                                <input type="hidden" name="id" value={b.id} />
                                <Submit className="btn btn-danger btn-sm">Delete</Submit>
                              </ActionForm>
                            </div>
                          </div>
                        </details>
                      )}
                    </li>
                  ))}
                </ol>
              )}

              {writer && (
                <ActionForm action={addBossAction} resetOnSuccess className="flex gap-2 border-t border-line bg-bg/40 px-5 py-3">
                  <input type="hidden" name="raidId" value={r.id} />
                  <input name="name" className="input !min-h-9 text-sm" placeholder="Add a boss…" maxLength={60} required aria-label="New boss name" />
                  <Submit className="btn btn-sm">Add</Submit>
                </ActionForm>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
