import "server-only";
import { one, query } from "@/lib/db";
import type { ClassId, EventKind, Role, Ruleset } from "@/config/guild";

export type GuildEvent = {
  id: string;
  title: string;
  kind: EventKind;
  raidId: string | null;
  raidName: string | null;
  raidSize: number | null;
  ruleset: Ruleset | null;
  startsAt: Date;
  durationMinutes: number;
  capacity: number | null;
  description: string | null;
  countsForAttendance: boolean;
  ended: boolean;
};

export type EventSummary = GuildEvent & {
  yes: number;
  maybe: number;
  no: number;
  tanks: number;
  healers: number;
  dps: number;
  attendanceTaken: boolean;
};

const EVENT_COLUMNS = `
  e.id, e.title, e.kind, e.raid_id as "raidId", r.name as "raidName", r.size as "raidSize",
  e.ruleset, e.starts_at as "startsAt", e.duration_minutes as "durationMinutes", e.capacity,
  e.description, e.counts_for_attendance as "countsForAttendance",
  (e.starts_at + make_interval(mins => e.duration_minutes) < now()) as ended`;

const SUMMARY_COLUMNS = `
  ${EVENT_COLUMNS},
  count(s.*) filter (where s.status = 'yes')::int as yes,
  count(s.*) filter (where s.status = 'maybe')::int as maybe,
  count(s.*) filter (where s.status = 'no')::int as no,
  count(s.*) filter (where s.status = 'yes' and s.role = 'tank')::int as tanks,
  count(s.*) filter (where s.status = 'yes' and s.role = 'healer')::int as healers,
  count(s.*) filter (where s.status = 'yes' and s.role = 'dps')::int as dps,
  exists (select 1 from attendance a where a.event_id = e.id) as "attendanceTaken"`;

export async function listEvents(when: "upcoming" | "past", limit = 50): Promise<EventSummary[]> {
  // An event stays "upcoming" until it has ended.
  const cond =
    when === "upcoming"
      ? `e.starts_at + make_interval(mins => e.duration_minutes) >= now()`
      : `e.starts_at + make_interval(mins => e.duration_minutes) < now()`;
  return query<EventSummary>(
    `select ${SUMMARY_COLUMNS}
     from events e
     left join raids r on r.id = e.raid_id
     left join signups s on s.event_id = e.id
     where ${cond}
     group by e.id, r.id
     order by e.starts_at ${when === "upcoming" ? "asc" : "desc"}
     limit $1`,
    [limit],
  );
}

export async function getEvent(id: string): Promise<GuildEvent | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return one<GuildEvent>(`select ${EVENT_COLUMNS} from events e left join raids r on r.id = e.raid_id where e.id = $1`, [
    id,
  ]);
}

export async function eventOptions(limit = 40) {
  return query<{ id: string; title: string; startsAt: Date }>(
    `select id, title, starts_at as "startsAt" from events where starts_at <= now() + interval '1 day'
     order by starts_at desc limit $1`,
    [limit],
  );
}

export type Signup = {
  characterId: string;
  firstName: string;
  secondName: string;
  region: string;
  ruleset: Ruleset;
  class: ClassId;
  memberName: string | null;
  status: "yes" | "maybe" | "no";
  role: Role;
  note: string | null;
  updatedAt: Date;
};

export async function listSignups(eventId: string): Promise<Signup[]> {
  return query<Signup>(
    `select s.character_id as "characterId", c.first_name as "firstName", c.second_name as "secondName",
            c.region, c.ruleset, c.class, m.name as "memberName", s.status, s.role, s.note, s.updated_at as "updatedAt"
     from signups s
     join characters c on c.id = s.character_id
     left join members m on m.id = c.member_id
     where s.event_id = $1
     order by array_position(array['yes','maybe','no'], s.status), array_position(array['tank','healer','dps'], s.role), c.first_name`,
    [eventId],
  );
}

export type EventInput = {
  title: string;
  kind: EventKind;
  raidId: string | null;
  ruleset: Ruleset | null;
  startsAt: Date;
  durationMinutes: number;
  capacity: number | null;
  description: string | null;
  countsForAttendance: boolean;
};

export async function createEvent(e: EventInput) {
  const row = await one<{ id: string }>(
    `insert into events (title, kind, raid_id, ruleset, starts_at, duration_minutes, capacity, description, counts_for_attendance)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
    [e.title, e.kind, e.raidId, e.ruleset, e.startsAt, e.durationMinutes, e.capacity, e.description, e.countsForAttendance],
  );
  return row!.id;
}

export async function updateEvent(id: string, e: EventInput) {
  await query(
    `update events set title=$2, kind=$3, raid_id=$4, ruleset=$5, starts_at=$6, duration_minutes=$7, capacity=$8,
       description=$9, counts_for_attendance=$10
     where id=$1`,
    [id, e.title, e.kind, e.raidId, e.ruleset, e.startsAt, e.durationMinutes, e.capacity, e.description, e.countsForAttendance],
  );
}

export async function deleteEvent(id: string) {
  await query(`delete from events where id = $1`, [id]);
}

export async function upsertSignup(s: {
  eventId: string;
  characterId: string;
  status: "yes" | "maybe" | "no";
  role: Role;
  note: string | null;
}) {
  await query(
    `insert into signups (event_id, character_id, status, role, note) values ($1,$2,$3,$4,$5)
     on conflict (event_id, character_id) do update
       set status = excluded.status, role = excluded.role, note = excluded.note, updated_at = now()`,
    [s.eventId, s.characterId, s.status, s.role, s.note],
  );
}

export async function removeSignup(eventId: string, characterId: string) {
  await query(`delete from signups where event_id = $1 and character_id = $2`, [eventId, characterId]);
}

export async function characterSignups(characterId: string, limit = 10) {
  return query<{ eventId: string; title: string; startsAt: Date; status: string; role: Role }>(
    `select e.id as "eventId", e.title, e.starts_at as "startsAt", s.status, s.role
     from signups s join events e on e.id = s.event_id
     where s.character_id = $1 and e.starts_at + make_interval(mins => e.duration_minutes) >= now()
     order by e.starts_at limit $2`,
    [characterId, limit],
  );
}
