import "server-only";
import { query, tx } from "@/lib/db";
import { getDkpSettings } from "./settings";

export const ATTENDANCE_STATUSES = ["present", "late", "bench", "absent"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
const EARNS_DKP: AttendanceStatus[] = ["present", "late", "bench"];

export async function getAttendance(eventId: string) {
  const rows = await query<{ characterId: string; status: AttendanceStatus }>(
    `select character_id as "characterId", status from attendance where event_id = $1`,
    [eventId],
  );
  return new Map(rows.map((r) => [r.characterId, r.status]));
}

/**
 * Replace the check-ins for an event. DKP attendance awards are rewritten in
 * the same transaction so re-saving never double-awards.
 */
export async function saveAttendance(
  eventId: string,
  eventTitle: string,
  entries: { characterId: string; status: AttendanceStatus }[],
) {
  const { attendanceAward } = await getDkpSettings();
  await tx(async (q) => {
    await q.query(`delete from attendance where event_id = $1`, [eventId]);
    await q.query(`delete from dkp_ledger where event_id = $1 and kind = 'attendance'`, [eventId]);
    for (const e of entries) {
      await q.query(`insert into attendance (event_id, character_id, status) values ($1, $2, $3)`, [
        eventId,
        e.characterId,
        e.status,
      ]);
      if (attendanceAward && EARNS_DKP.includes(e.status)) {
        await q.query(
          `insert into dkp_ledger (character_id, kind, amount, reason, event_id) values ($1, 'attendance', $2, $3, $4)`,
          [e.characterId, attendanceAward, `Attendance: ${eventTitle}`, eventId],
        );
      }
    }
  });
}

export async function characterAttendance(characterId: string, limit = 12) {
  return query<{ eventId: string; title: string; startsAt: Date; status: AttendanceStatus }>(
    `select e.id as "eventId", e.title, e.starts_at as "startsAt", a.status
     from attendance a join events e on e.id = a.event_id
     where a.character_id = $1 order by e.starts_at desc limit $2`,
    [characterId, limit],
  );
}
