import Link from "next/link";
import { EVENT_KIND_LABELS } from "@/config/guild";
import type { EventSummary } from "@/lib/data/events";
import { fmtTime } from "@/lib/time";
import { GUILD_TIMEZONE } from "@/config/guild";
import { IconCross, IconShield, IconSword } from "./icons";
import { RulesetChip } from "./ui";

function dateParts(d: Date) {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: GUILD_TIMEZONE, ...o }).format(d);
  return { dow: f({ weekday: "short" }), day: f({ day: "numeric" }), mon: f({ month: "short" }) };
}

export function EventRow({ e, past = false }: { e: EventSummary; past?: boolean }) {
  const p = dateParts(new Date(e.startsAt));
  const cap = e.capacity ?? e.raidSize;
  return (
    <Link
      href={`/events/${e.id}`}
      className={`card group flex items-stretch gap-4 p-3 transition-colors hover:border-gold-dim sm:p-4 ${past ? "opacity-75" : ""}`}
    >
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-bg py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gold">{p.dow}</span>
        <span className="display text-2xl leading-none text-ink">{p.day}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted">{p.mon}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-ink group-hover:text-gold-bright">{e.title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-dim">
          <span>{fmtTime(e.startsAt)}</span>
          <span className="text-muted">·</span>
          <span>{e.raidName ?? EVENT_KIND_LABELS[e.kind]}</span>
          {e.ruleset && <RulesetChip ruleset={e.ruleset} />}
          {past && e.attendanceTaken && <span className="chip">Attendance logged</span>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center gap-1.5 text-xs">
        <div className="num text-sm text-ink">
          <span className="text-yes">{e.yes}</span>
          {cap ? <span className="text-muted">/{cap}</span> : null}
          {e.maybe > 0 && <span className="ml-1.5 text-maybe">+{e.maybe}?</span>}
        </div>
        <div className="num flex items-center gap-2 text-ink-dim">
          <span className="flex items-center gap-0.5" title="Tanks">
            <IconShield size={12} />
            {e.tanks}
          </span>
          <span className="flex items-center gap-0.5" title="Healers">
            <IconCross size={12} />
            {e.healers}
          </span>
          <span className="flex items-center gap-0.5" title="DPS">
            <IconSword size={12} />
            {e.dps}
          </span>
        </div>
      </div>
    </Link>
  );
}
