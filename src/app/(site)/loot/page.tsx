import { notFound } from "next/navigation";
import { FEATURES, ITEM_QUALITIES, QUALITY_COLORS } from "@/config/guild";
import { isWriter } from "@/lib/auth";
import { dkpStandings, listLoot } from "@/lib/data/loot";
import { characterOptions } from "@/lib/data/roster";
import { eventOptions } from "@/lib/data/events";
import { bossOptions } from "@/lib/data/progression";
import { getDkpSettings } from "@/lib/data/settings";
import { adjustDkpAction, applyDecayAction, deleteLootAction, recordLootAction } from "@/lib/actions/loot";
import { fmtShortDate, toLocalInput, tzName } from "@/lib/time";
import { ActionForm, Submit } from "@/components/forms";
import { IconPlus } from "@/components/icons";
import { CharName, Empty, PageHeader, SectionTitle } from "@/components/ui";

export const metadata = { title: "Loot & DKP" };

export default async function LootPage() {
  if (!FEATURES.loot) notFound();
  const [writer, loot, standings, dkp] = await Promise.all([isWriter(), listLoot(150), dkpStandings(), getDkpSettings()]);
  const [chars, events, bosses] = writer
    ? await Promise.all([characterOptions(), eventOptions(), bossOptions()])
    : [[], [], []];

  return (
    <>
      <PageHeader
        eyebrow="Loot"
        title="Loot & DKP"
        sub={`DKP-lite: ${dkp.startingBalance} to start, +${dkp.attendanceAward} per raid attended, ${dkp.decayPercent}% decay when officers apply it. Loot council can override with a note.`}
      />

      {writer && (
        <details className="card mb-8 p-0">
          <summary className="flex items-center gap-2 px-5 py-4 text-sm font-semibold text-gold">
            <IconPlus size={16} /> Record loot
          </summary>
          <ActionForm action={recordLootAction} resetOnSuccess className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            <div className="field sm:col-span-2">
              <label className="label" htmlFor="itemName">
                Item
              </label>
              <input id="itemName" name="itemName" className="input" required maxLength={120} placeholder="Onyxia Hide Backpack" />
            </div>
            <div className="field">
              <label className="label" htmlFor="characterId">
                Awarded to
              </label>
              <select id="characterId" name="characterId" className="input" required defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {chars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.secondName}
                    {c.memberName ? ` (${c.memberName})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label className="label" htmlFor="quality">
                  Quality
                </label>
                <select id="quality" name="quality" className="input" defaultValue="epic">
                  {ITEM_QUALITIES.map((q) => (
                    <option key={q} value={q} style={{ color: QUALITY_COLORS[q] }}>
                      {q[0].toUpperCase() + q.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="dkpCost">
                  DKP cost
                </label>
                <input id="dkpCost" name="dkpCost" type="number" inputMode="numeric" min={0} className="input" defaultValue={0} />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="eventId">
                Event <span className="font-normal text-muted">(optional)</span>
              </label>
              <select id="eventId" name="eventId" className="input" defaultValue="">
                <option value="">—</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} · {fmtShortDate(e.startsAt)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="bossId">
                Boss <span className="font-normal text-muted">(optional)</span>
              </label>
              <select id="bossId" name="bossId" className="input" defaultValue="">
                <option value="">—</option>
                {bosses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.raidName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="awardedAt">
                When <span className="font-normal text-muted">({tzName()})</span>
              </label>
              <input id="awardedAt" name="awardedAt" type="datetime-local" className="input" defaultValue={toLocalInput(new Date())} />
            </div>
            <div className="field">
              <label className="label" htmlFor="itemId">
                Item ID <span className="font-normal text-muted">(optional)</span>
              </label>
              <input id="itemId" name="itemId" type="number" inputMode="numeric" min={1} className="input" />
            </div>
            <div className="field sm:col-span-2">
              <label className="label" htmlFor="councilNote">
                Loot council note
              </label>
              <input
                id="councilNote"
                name="councilNote"
                className="input"
                maxLength={500}
                placeholder="Override: BiS for MT, council vote 2–1"
              />
            </div>
            <div className="flex justify-end sm:col-span-2">
              <Submit>Record</Submit>
            </div>
          </ActionForm>
        </details>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <section>
          <SectionTitle>Standings</SectionTitle>
          {standings.length === 0 ? (
            <Empty title="No one on the books">Add characters to the roster to start DKP.</Empty>
          ) : (
            <div className="card overflow-hidden">
              <table className="table">
                <thead>
                  <tr>
                    <th>Character</th>
                    <th className="text-right">DKP</th>
                    <th className="hidden text-right sm:table-cell">Earned</th>
                    <th className="text-right">Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
                    <tr key={s.characterId}>
                      <td className="max-w-0 truncate">
                        <span className="num mr-2 text-xs text-muted">{i + 1}</span>
                        <CharName c={s} />
                      </td>
                      <td className="num text-right text-gold-bright">{s.balance}</td>
                      <td className="num hidden text-right text-ink-dim sm:table-cell">{s.earned}</td>
                      <td className="num text-right text-ink-dim">{s.spent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {writer && standings.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              <ActionForm
                action={applyDecayAction}
                confirm={`Apply ${dkp.decayPercent}% decay to every positive balance? This can't be undone automatically.`}
                className="card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <span className="text-sm text-ink-dim">
                  Decay: <span className="text-ink">{dkp.decayPercent}%</span> of every positive balance
                </span>
                <Submit className="btn btn-sm" pendingText="Applying…">
                  Apply decay
                </Submit>
              </ActionForm>
              <details className="card p-0">
                <summary className="px-4 py-3 text-sm font-semibold text-ink-dim hover:text-ink">Manual adjustment</summary>
                <ActionForm action={adjustDkpAction} resetOnSuccess className="grid grid-cols-[1fr_6rem] gap-3 px-4 pb-4">
                  <select name="characterId" className="input col-span-2" required defaultValue="" aria-label="Character">
                    <option value="" disabled>
                      Character…
                    </option>
                    {chars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.secondName}
                      </option>
                    ))}
                  </select>
                  <input name="reason" className="input" placeholder="Reason" maxLength={140} aria-label="Reason" />
                  <input name="amount" type="number" inputMode="numeric" className="input" placeholder="±" required aria-label="Amount" />
                  <div className="col-span-2 flex justify-end">
                    <Submit className="btn btn-sm">Adjust</Submit>
                  </div>
                </ActionForm>
              </details>
            </div>
          )}
        </section>

        <section>
          <SectionTitle aside={`${loot.length} item${loot.length === 1 ? "" : "s"}`}>Loot history</SectionTitle>
          {loot.length === 0 ? (
            <Empty title="No loot yet">First drops land Dec 9.</Empty>
          ) : (
            <ul className="card divide-y divide-line">
              {loot.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 text-sm">
                    <div className="font-semibold" style={{ color: QUALITY_COLORS[l.quality] }}>
                      [{l.itemName}]
                    </div>
                    <div className="mt-0.5">
                      <CharName c={l} className="text-[13px]" />
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      {fmtShortDate(l.awardedAt)}
                      {l.bossName && ` · ${l.bossName}`}
                      {l.eventTitle && ` · ${l.eventTitle}`}
                    </div>
                    {l.councilNote && (
                      <div className="mt-1.5 rounded-md border-l-2 border-gold-dim bg-gold/5 px-2 py-1 text-xs text-ink-dim">
                        {l.councilNote}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="num text-sm text-ink-dim">{l.dkpCost ? `−${l.dkpCost}` : "—"}</span>
                    {writer && (
                      <ActionForm action={deleteLootAction} confirm={`Remove ${l.itemName}? Their DKP is refunded.`}>
                        <input type="hidden" name="id" value={l.id} />
                        <Submit className="text-xs text-muted hover:text-no" pendingText="…">
                          remove
                        </Submit>
                      </ActionForm>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
