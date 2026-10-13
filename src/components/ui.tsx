import Link from "next/link";
import { CLASSES, ROLE_LABELS, RULESET_LABELS, type ClassId, type Role, type Ruleset } from "@/config/guild";
import { characterPath, displayName } from "@/lib/identity";
import { ROLE_ICONS } from "./icons";

export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="display text-3xl leading-tight text-ink sm:text-4xl">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-sm text-ink-dim">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="display text-xl text-ink">{children}</h2>
      {aside && <div className="text-sm text-ink-dim">{aside}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="display text-lg text-ink">{title}</div>
      {children && <div className="max-w-md text-sm text-ink-dim">{children}</div>}
    </div>
  );
}

export function classColor(c: ClassId | string) {
  return CLASSES[c as ClassId]?.color ?? "var(--text)";
}

export function CharName({
  c,
  link = true,
  className = "",
}: {
  c: { firstName: string; secondName: string; class: ClassId | string; region: string; ruleset: string };
  link?: boolean;
  className?: string;
}) {
  const name = (
    <span className={`font-semibold ${className}`} style={{ color: classColor(c.class) }}>
      {displayName(c)}
    </span>
  );
  if (!link) return name;
  return (
    <Link
      href={characterPath(c as Parameters<typeof characterPath>[0])}
      className="underline-offset-4 hover:underline"
      style={{ textDecorationColor: classColor(c.class) }}
    >
      {name}
    </Link>
  );
}

export function RoleIcon({ role, size = 14 }: { role: Role; size?: number }) {
  const I = ROLE_ICONS[role];
  return (
    <span title={ROLE_LABELS[role]} className="inline-flex text-ink-dim">
      <I size={size} />
    </span>
  );
}

export function RulesetChip({ ruleset }: { ruleset: Ruleset | string }) {
  const tone =
    ruleset === "pvp"
      ? "text-[#e48a7e] border-[#e48a7e]/30"
      : ruleset === "hardcore"
        ? "text-[#ff6b5b] border-[#ff6b5b]/40"
        : ruleset === "rp"
          ? "text-[#b6a4ef] border-[#b6a4ef]/30"
          : "";
  return <span className={`chip ${tone}`}>{RULESET_LABELS[ruleset as Ruleset] ?? ruleset}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className="num mt-1 text-2xl text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function LockedNote({ what = "make changes" }: { what?: string }) {
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-ink-dim">
      <span>Read-only view. Enter the guild passcode to {what}.</span>
      <Link href="/login" className="btn btn-sm">
        Unlock
      </Link>
    </div>
  );
}
