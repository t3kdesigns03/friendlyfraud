import Link from "next/link";
import { notFound } from "next/navigation";
import { CLASSES, FEATURES, QUALITY_COLORS, RACES, REGION_LABELS, ROLE_LABELS, RULESET_LABELS, type Region } from "@/config/guild";
import { isWriter } from "@/lib/auth";
import { getCharacter } from "@/lib/data/roster";
import { characterSignups } from "@/lib/data/events";
import { characterAttendance } from "@/lib/data/attendance";
import { characterLedger, characterLoot } from "@/lib/data/loot";
import { isBlizzardSyncEnabled } from "@/api";
import { deleteCharacterAction, syncCharacterAction } from "@/lib/actions/roster";
import { characterPath, displayName, identityKey, parseIdentityParams } from "@/lib/identity";
import { fmtDate, fmtShortDate, fmtTime } from "@/lib/time";
import { ActionForm, Submit } from "@/components/forms";
import { ROLE_ICONS } from "@/components/icons";
import { classColor, Empty, RulesetChip, SectionTitle, Stat } from "@/components/ui";

const ATT_TONE: Record<string, string> = {
  present: "text-yes",
  late: "text-maybe",
  bench: "text-info",
  absent: "text-no",
};

export async function generateMetadata({ params }: PageProps<"/characters/[region]/[ruleset]/[name]">) {
  const id = parseIdentityParams(await params);
  const c = id ? await getCharacter(id) : null;
  return { title: c ? displayName(c) : "Character" };
}

export default async function CharacterPage({ params }: PageProps<"/characters/[region]/[ruleset]/[name]">) {
  const identity = parseIdentityParams(await params);
  if (!identity) notFound();
  const c = await getCharacter(identity);
  if (!c) notFound();

  const [writer, signups, attendance, loot, ledger, syncOn] = await Promise.all([
    isWriter(),
    characterSignups(c.id),
    characterAttendance(c.id),
    characterLoot(c.id),
    characterLedger(c.id),
    isBlizzardSyncEnabled(),
  ]);
  const color = classColor(c.class);
  const RoleI = ROLE_ICONS[c.role];

  return (
    <div className="flex flex-col gap-10">
      <header className="relative">
        <Link href="/roster" className="text-xs text-muted hover:text-ink">
          ← Roster
        </Link>
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            {c.portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.portraitUrl} alt="" className="h-16 w-16 rounded-xl border border-line object-cover" />
            ) : (
              <div
                className="display flex h-16 w-16 items-center justify-center rounded-xl border text-2xl"
                style={{ borderColor: `${color}55`, color, background: `${color}10` }}
              >
                {c.firstName[0]}
                {c.secondName[0]}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="display text-4xl leading-none sm:text-5xl" style={{ color }}>
                {displayName(c)}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-dim">
                <span>
                  {c.level ? `Level ${c.level} ` : ""}
                  {RACES[c.race]?.name} {CLASSES[c.class]?.name}
                </span>
                <span className="text-muted">·</span>
                <span className="flex items-center gap-1">
                  <RoleI size={14} /> {ROLE_LABELS[c.role]}
                </span>
                {c.memberName && (
                  <>
                    <span className="text-muted">·</span>
                    <span>played by {c.memberName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {writer && (
            <div className="flex gap-2">
              <Link href={`${characterPath(c)}/edit`} className="btn">
                Edit
              </Link>
              <ActionForm action={deleteCharacterAction} confirm={`Remove ${displayName(c)} and all their signups, attendance and loot history?`}>
                <input type="hidden" name="id" value={c.id} />
                <Submit className="btn btn-danger" pendingText="Removing…">
                  Remove
                </Submit>
              </ActionForm>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {c.isMain ? <span className="chip chip-gold">Main</span> : <span className="chip">Alt</span>}
          {c.status === "planned" && <span className="chip border-info/40 text-info">Planned</span>}
          {c.status === "inactive" && <span className="chip">Inactive</span>}
          <RulesetChip ruleset={c.ruleset} />
          <span className="chip">{REGION_LABELS[c.region as Region]}</span>
          <span className="chip num" title="Identity key: region / ruleset / name">
            {identityKey(c)}
          </span>
        </div>
      </header>

      <div className={`grid grid-cols-2 gap-3 ${FEATURES.loot ? "sm:grid-cols-4" : "sm:max-w-md"}`}>
        <Stat
          label="Attendance"
          value={c.attendancePct === null ? "—" : `${c.attendancePct}%`}
          hint={c.eligible ? `${c.attended} of ${c.eligible} events` : "No events logged yet"}
        />
        {FEATURES.loot && <Stat label="DKP" value={<span className="text-gold-bright">{c.dkp}</span>} />}
        {FEATURES.loot && <Stat label="Loot" value={loot.length} hint={loot[0] ? `last ${fmtShortDate(loot[0].awardedAt)}` : undefined} />}
        <Stat label="Upcoming" value={signups.filter((s) => s.status === "yes").length} hint="signed up" />
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <SectionTitle>Upcoming signups</SectionTitle>
          {signups.length === 0 ? (
            <Empty title="No signups">Not signed up for anything coming up.</Empty>
          ) : (
            <ul className="card divide-y divide-line">
              {signups.map((s) => (
                <li key={s.eventId}>
                  <Link href={`/events/${s.eventId}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2/50">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{s.title}</span>
                      <span className="text-xs text-muted">
                        {fmtDate(s.startsAt)} · {fmtTime(s.startsAt)}
                      </span>
                    </span>
                    <span className={`chip ${s.status === "yes" ? "text-yes" : s.status === "maybe" ? "text-maybe" : "text-no"}`}>
                      {s.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle>Attendance</SectionTitle>
          {attendance.length === 0 ? (
            <Empty title="No check-ins yet" />
          ) : (
            <ul className="card divide-y divide-line">
              {attendance.map((a) => (
                <li key={a.eventId} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <Link href={`/events/${a.eventId}`} className="min-w-0 truncate text-ink hover:text-gold-bright">
                    {a.title}
                  </Link>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted">{fmtShortDate(a.startsAt)}</span>
                    <span className={`w-14 text-right text-xs font-semibold capitalize ${ATT_TONE[a.status]}`}>{a.status}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {FEATURES.loot && (
        <>
        <section>
          <SectionTitle>Loot history</SectionTitle>
          {loot.length === 0 ? (
            <Empty title="Nothing yet" />
          ) : (
            <ul className="card divide-y divide-line">
              {loot.map((l) => (
                <li key={l.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold" style={{ color: QUALITY_COLORS[l.quality] }}>
                      [{l.itemName}]
                    </span>
                    <span className="num text-xs text-ink-dim">{l.dkpCost ? `−${l.dkpCost}` : "free"}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {fmtShortDate(l.awardedAt)}
                    {l.bossName ? ` · ${l.bossName}` : ""}
                    {l.councilNote ? ` · ${l.councilNote}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle aside={<span className="num text-gold-bright">{c.dkp} DKP</span>}>DKP ledger</SectionTitle>
          {ledger.length === 0 ? (
            <Empty title="No DKP activity" />
          ) : (
            <ul className="card divide-y divide-line">
              {ledger.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate text-ink">{d.reason ?? d.kind}</span>
                    <span className="text-xs capitalize text-muted">
                      {d.kind} · {fmtShortDate(d.createdAt)}
                    </span>
                  </span>
                  <span className={`num shrink-0 ${d.amount >= 0 ? "text-yes" : "text-no"}`}>
                    {d.amount >= 0 ? "+" : "−"}
                    {Math.abs(d.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        </>
        )}
      </div>

      <section className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="eyebrow mb-1">Battle.net</div>
          {syncOn ? (
            <p className="text-sm text-ink-dim">
              {c.apiSyncedAt ? `Last synced ${fmtShortDate(c.apiSyncedAt)}` : "Not synced yet."}
              {c.apiItemLevel ? ` · item level ${c.apiItemLevel}` : ""}
            </p>
          ) : (
            <p className="text-sm text-ink-dim">
              Profile sync is dark until Blizzard opens a WoW: Forever API namespace. Everything here is entered by hand.
            </p>
          )}
        </div>
        {writer && syncOn && (
          <ActionForm action={syncCharacterAction}>
            <input type="hidden" name="id" value={c.id} />
            <Submit className="btn" pendingText="Syncing…">
              Sync now
            </Submit>
          </ActionForm>
        )}
      </section>
      <p className="-mt-6 text-xs text-muted">
        {RULESET_LABELS[c.ruleset]} · {REGION_LABELS[c.region as Region]} · joined {fmtShortDate(c.joinedAt)}
        {c.notes ? ` · ${c.notes}` : ""}
      </p>
    </div>
  );
}
