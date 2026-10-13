import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isWriter } from "@/lib/auth";
import { getEvent, listSignups } from "@/lib/data/events";
import { characterOptions } from "@/lib/data/roster";
import { getAttendance } from "@/lib/data/attendance";
import { getDkpSettings } from "@/lib/data/settings";
import { fmtDateLong } from "@/lib/time";
import { AttendanceForm } from "@/components/attendance-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Attendance" };

export default async function AttendancePage({ params }: PageProps<"/events/[id]/attendance">) {
  const { id } = await params;
  if (!(await isWriter())) redirect(`/login?next=/events/${id}/attendance`);
  const event = await getEvent(id);
  if (!event) notFound();
  const [signups, chars, attendance, dkp] = await Promise.all([
    listSignups(id),
    characterOptions(true),
    getAttendance(id),
    getDkpSettings(),
  ]);

  const signupBy = new Map(signups.map((s) => [s.characterId, s.status]));
  const order = { yes: 0, maybe: 1, no: 3 } as const;
  const rows = chars
    // Inactive characters only show if they were already checked in.
    .filter((c) => c.status !== "inactive" || attendance.has(c.id))
    .map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.secondName}`,
      class: c.class,
      memberName: c.memberName,
      signup: signupBy.get(c.id) ?? null,
    }))
    // Signed-up first, then everyone else; anyone already checked in stays visible.
    .sort((a, b) => (a.signup ? order[a.signup] : 2) - (b.signup ? order[b.signup] : 2) || a.name.localeCompare(b.name));

  // First visit: pre-mark everyone who said "yes" as present.
  const initial: Record<string, "present" | "late" | "bench" | "absent"> = {};
  if (attendance.size) for (const [cid, st] of attendance) initial[cid] = st;
  else for (const s of signups) if (s.status === "yes") initial[s.characterId] = "present";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/events/${id}`} className="text-xs text-muted hover:text-ink">
        ← {event.title}
      </Link>
      <div className="mt-4">
        <PageHeader
          eyebrow="Check-in"
          title="Attendance"
          sub={`${event.title} · ${fmtDateLong(event.startsAt)}. Here, Late and Bench count toward attendance % and earn DKP.`}
        />
      </div>
      {rows.length === 0 ? (
        <p className="card p-4 text-sm text-ink-dim">No characters on the roster yet.</p>
      ) : (
        <AttendanceForm eventId={id} rows={rows} initial={initial} award={dkp.attendanceAward} />
      )}
    </div>
  );
}
