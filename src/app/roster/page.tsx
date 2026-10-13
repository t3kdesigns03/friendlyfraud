import Link from "next/link";
import {
  CHARACTER_STATUSES,
  CLASS_IDS,
  CLASSES,
  ROLE_LABELS,
  ROLES,
  RULESET_LABELS,
  RULESETS,
} from "@/config/guild";
import { isWriter } from "@/lib/auth";
import { listCharacters } from "@/lib/data/roster";
import { CharacterCard } from "@/components/character-card";
import { IconPlus } from "@/components/icons";
import { Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Roster" };

type Filters = { class?: string; role?: string; ruleset?: string; status?: string };

function href(current: Filters, key: keyof Filters, value?: string) {
  const next = { ...current, [key]: value };
  const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
  return qs ? `/roster?${qs}` : "/roster";
}

function FilterRow({
  label,
  k,
  current,
  options,
}: {
  label: string;
  k: keyof Filters;
  current: Filters;
  options: { value: string; label: string; color?: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</span>
      <div className="-mr-4 flex gap-1.5 overflow-x-auto pr-4 pb-1 [scrollbar-width:none] sm:mr-0 sm:flex-wrap sm:overflow-visible sm:pr-0">
        <Link href={href(current, k)} className={`chip h-7 ${!current[k] ? "chip-gold" : "hover:text-ink"}`}>
          All
        </Link>
        {options.map((o) => {
          const active = current[k] === o.value;
          return (
            <Link
              key={o.value}
              href={href(current, k, active ? undefined : o.value)}
              className={`chip h-7 ${active ? "chip-gold" : "hover:text-ink"}`}
              style={o.color && !active ? { color: o.color, borderColor: `${o.color}40` } : undefined}
            >
              {o.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function RosterPage({ searchParams }: PageProps<"/roster">) {
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters: Filters = { class: pick("class"), role: pick("role"), ruleset: pick("ruleset"), status: pick("status") };
  const [writer, chars, all] = await Promise.all([isWriter(), listCharacters(filters), listCharacters()]);
  const filtered = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Characters"
        sub="Two-part names, by region and ruleset. No realms in Forever."
        actions={
          writer && (
            <Link href="/roster/new" className="btn btn-gold">
              <IconPlus size={16} /> Add character
            </Link>
          )
        }
      />

      <div className="card mb-6 flex flex-col gap-2.5 p-4">
        <FilterRow
          label="Class"
          k="class"
          current={filters}
          options={CLASS_IDS.map((id) => ({ value: id, label: CLASSES[id].name, color: CLASSES[id].color }))}
        />
        <FilterRow label="Role" k="role" current={filters} options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
        <FilterRow
          label="Ruleset"
          k="ruleset"
          current={filters}
          options={RULESETS.map((r) => ({ value: r, label: RULESET_LABELS[r] }))}
        />
        <FilterRow
          label="Status"
          k="status"
          current={filters}
          options={CHARACTER_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
        />
      </div>

      <div className="mb-3 text-xs text-muted">
        {chars.length} of {all.length} character{all.length === 1 ? "" : "s"}
        {filtered && (
          <>
            {" · "}
            <Link href="/roster" className="text-gold hover:underline">
              clear filters
            </Link>
          </>
        )}
      </div>

      {chars.length === 0 ? (
        <Empty title={filtered ? "No matches" : "The roster is empty"}>
          {filtered
            ? "Nobody fits those filters."
            : writer
              ? "Add your planned launch characters — two-part name, class, race, ruleset."
              : "Officers haven't added characters yet."}
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chars.map((c) => (
            <CharacterCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </>
  );
}
