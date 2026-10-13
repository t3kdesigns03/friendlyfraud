import Link from "next/link";
import { notFound } from "next/navigation";
import { EVENT_KIND_LABELS, ROLE_LABELS, ROLES, type Role } from "@/config/guild";
import { isWriter } from "@/lib/auth";
import { getEvent, listSignups, type Signup } from "@/lib/data/events";
import { characterOptions } from "@/lib/data/roster";
import { getAttendance } from "@/lib/data/attendance";
import { deleteEventAction, removeSignupAction } from "@/lib/actions/events";
import { fmtDateLong, fmtTime } from "@/lib/time";
import { ActionForm, Submit } from "@/components/forms";
import { ROLE_ICONS } from "@/components/icons";
import { SignupForm } from "@/components/signup-form";
import { CharName, LockedNote, RulesetChip, SectionTitle } from "@/components/ui";

export async function generateMetadata({ params }: PageProps<"/events/[id]">) {
  const e = await getEvent((await params).id);
  return { title: e?.title ?? "Event" };
}

function SignupGroup({ title, tone, list, writer, eventId }: { title: string; tone: string; list: Signup[]; writer: boolean; eventId: string }) {
  if (list.length === 0) return null;
  const byRole = ROLES.map((r) => [r, list.filter((s) => s.role === r)] as const).filter(([, l]) => l.length);
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className={`text-sm font-semibold ${tone}`}>{title}</h3>
        <span className="num text-sm text-ink-dim">{list.length}</span>
      </div>
      <div className="flex flex-col gap-4">
        {byRole.map(([role, l]) => {
          const I = ROLE_ICONS[role as Role];
          return (
            <div key={role}>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted">
                <I size={12} /> {ROLE_LABELS[role as Role]} · {l.length}
              </div>
              <ul className="flex flex-col gap-1">
                {l.map((s) => (
                  <li key={s.characterId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      <CharName c={s} />
                      {s.memberName && <span className="ml-2 text-xs text-muted">{s.memberName}</span>}
                      {s.note && <span className="ml-2 text-xs text-ink-dim italic">“{s.note}”</span>}
                    </span>
                    {writer && (
                      <ActionForm action={removeSignupAction}>
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="characterId" value={s.characterId} />
                        <Submit className="btn btn-ghost btn-sm !min-h-6 !px-1.5 text-xs" pendingText="…">
                          ✕
                        </Submit>
                      </ActionForm>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function EventPage({ params, searchParams }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const { saved } = await searchParams;
  const event = await getEvent(id);
  if (!event) notFound();
  const [writer, signups, chars, attendance] = await Promise.all([
    isWriter(),
    listSignups(id),
    characterOptions(),
    getAttendance(id),
  ]);
  const yes = signups.filter((s) => s.status === "yes");
  const maybe = signups.filter((s) => s.status === "maybe");
  const no = signups.filter((s) => s.status === "no");
  const cap = event.capacity ?? event.raidSize;
  const existing = Object.fromEntries(signups.map((s) => [s.characterId, { status: s.status, role: s.role, note: s.note }]));
  const eligibleChars = event.ruleset ? chars.filter((c) => c.ruleset === event.ruleset) : chars;
  const ended = event.ended;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link href="/events" className="text-xs text-muted hover:text-ink">
          ← Calendar
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow mb-2">{event.raidName ? `${event.raidName} · ${event.raidSize}-player` : EVENT_KIND_LABELS[event.kind]}</div>
            <h1 className="display text-4xl leading-tight text-ink sm:text-5xl">{event.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-dim">
              <span>{fmtDateLong(event.startsAt)}</span>
              <span className="text-muted">·</span>
              <span>{fmtTime(event.startsAt)}</span>
              <span className="text-muted">·</span>
              <span>{Math.round((event.durationMinutes / 60) * 10) / 10}h</span>
              {event.ruleset && <RulesetChip ruleset={event.ruleset} />}
            </div>
          </div>
          {writer && (
            <div className="flex flex-wrap gap-2">
              <Link href={`/events/${id}/attendance`} className="btn btn-gold">
                {attendance.size ? "Edit attendance" : "Take attendance"}
              </Link>
              <Link href={`/events/${id}/edit`} className="btn">
                Edit
              </Link>
              <ActionForm action={deleteEventAction} confirm="Delete this event, its signups and attendance?">
                <input type="hidden" name="id" value={id} />
                <Submit className="btn btn-danger" pendingText="…">
                  Delete
                </Submit>
              </ActionForm>
            </div>
          )}
        </div>
        {event.description && <p className="mt-4 max-w-2xl text-sm whitespace-pre-line text-ink-dim">{event.description}</p>}
        {saved === "attendance" && (
          <p className="mt-4 rounded-lg border border-yes/30 bg-yes/10 px-3 py-2 text-sm text-yes">
            Attendance saved and DKP awarded.
          </p>
        )}
      </header>

      <div className="grid grid-cols-4 gap-2 sm:max-w-xl">
        <div className="card px-3 py-2.5 text-center">
          <div className="num text-xl text-yes">
            {yes.length}
            {cap ? <span className="text-sm text-muted">/{cap}</span> : null}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted">In</div>
        </div>
        {ROLES.map((r) => {
          const I = ROLE_ICONS[r];
          return (
            <div key={r} className="card px-3 py-2.5 text-center">
              <div className="num flex items-center justify-center gap-1 text-xl text-ink">
                <I size={14} className="text-ink-dim" />
                {yes.filter((s) => s.role === r).length}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted">{ROLE_LABELS[r]}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <section>
          <SectionTitle>{ended ? "Signups closed" : "Sign up"}</SectionTitle>
          {ended ? (
            <p className="card p-4 text-sm text-ink-dim">This event has ended.{writer && attendance.size === 0 ? " Take attendance to award DKP." : ""}</p>
          ) : writer ? (
            <div className="card p-4">
              <SignupForm eventId={id} characters={eligibleChars} existing={existing} />
            </div>
          ) : (
            <LockedNote what="sign up" />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle aside={`${signups.length} response${signups.length === 1 ? "" : "s"}`}>Who&apos;s coming</SectionTitle>
          {signups.length === 0 && <p className="card p-4 text-sm text-ink-dim">No responses yet. Be first.</p>}
          <SignupGroup title="In" tone="text-yes" list={yes} writer={writer} eventId={id} />
          <SignupGroup title="Maybe" tone="text-maybe" list={maybe} writer={writer} eventId={id} />
          <SignupGroup title="Can't make it" tone="text-no" list={no} writer={writer} eventId={id} />
        </section>
      </div>
    </div>
  );
}
