import Link from "next/link";
import { CLASSES, FEATURES, RACES, REGION_LABELS, ROLE_LABELS, type Region } from "@/config/guild";
import type { CharacterWithStats } from "@/lib/data/roster";
import { characterPath, displayName } from "@/lib/identity";
import { ROLE_ICONS } from "./icons";
import { classColor, RulesetChip } from "./ui";

export function CharacterCard({ c }: { c: CharacterWithStats }) {
  const color = classColor(c.class);
  const RoleI = ROLE_ICONS[c.role];
  return (
    <Link
      href={characterPath(c)}
      className={`card group relative flex flex-col gap-3 overflow-hidden p-4 transition-colors hover:border-line-strong ${
        c.status === "inactive" ? "opacity-50" : ""
      }`}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color, opacity: 0.85 }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold" style={{ color }}>
            {displayName(c)}
          </div>
          <div className="text-xs text-ink-dim">
            {c.level ? `Level ${c.level} ` : ""}
            {RACES[c.race]?.name ?? c.race} {CLASSES[c.class]?.name ?? c.class}
          </div>
        </div>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-bg text-ink-dim"
          title={ROLE_LABELS[c.role]}
        >
          <RoleI size={16} />
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {c.isMain ? <span className="chip chip-gold">Main</span> : <span className="chip">Alt</span>}
        {c.status === "planned" && <span className="chip border-info/40 text-info">Planned</span>}
        {c.status === "inactive" && <span className="chip">Inactive</span>}
        <RulesetChip ruleset={c.ruleset} />
        <span className="chip" title={REGION_LABELS[c.region as Region]}>
          {c.region.toUpperCase()}
        </span>
      </div>
      <div className="mt-auto flex items-end justify-between border-t border-line pt-3 text-xs">
        <span className="truncate text-ink-dim">{c.memberName ?? "—"}</span>
        <span className="num flex gap-3 text-ink-dim">
          <span title="Attendance">
            <span className="text-ink">{c.attendancePct === null ? "—" : `${c.attendancePct}%`}</span> att
          </span>
          {FEATURES.loot && (
            <span title="DKP">
              <span className="text-gold-bright">{c.dkp}</span> dkp
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
