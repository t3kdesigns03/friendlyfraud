import "server-only";
import { query, one, tx, type Sql } from "@/lib/db";
import type { CharacterStatus, ClassId, RaceId, Region, Role, Ruleset } from "@/config/guild";
import type { CharacterIdentity } from "@/lib/identity";
import { getDkpSettings } from "./settings";

export type Character = CharacterIdentity & {
  id: string;
  memberId: string | null;
  memberName: string | null;
  class: ClassId;
  race: RaceId;
  role: Role;
  isMain: boolean;
  status: CharacterStatus;
  level: number | null;
  notes: string | null;
  joinedAt: Date;
  portraitUrl: string | null;
  apiItemLevel: number | null;
  apiSyncedAt: Date | null;
};

export type CharacterWithStats = Character & {
  dkp: number;
  attended: number;
  eligible: number;
  attendancePct: number | null;
};

export const CHARACTER_COLUMNS = `
  c.id, c.member_id as "memberId", m.name as "memberName",
  c.first_name as "firstName", c.second_name as "secondName", c.region, c.ruleset,
  c.class, c.race, c.role, c.is_main as "isMain", c.status, c.level, c.notes,
  c.joined_at as "joinedAt", c.portrait_url as "portraitUrl",
  c.api_item_level as "apiItemLevel", c.api_synced_at as "apiSyncedAt"`;

// An event counts toward a character's attendance % once attendance has been
// taken for it, and it happened after they joined (or they were checked in).
export const ATTENDANCE_STATS_CTE = `
  att_stats as (
    select c.id as character_id,
      count(e.id)::int as eligible,
      count(a.character_id) filter (where a.status in ('present', 'late', 'bench'))::int as attended
    from characters c
    join events e on e.counts_for_attendance
      and exists (select 1 from attendance x where x.event_id = e.id)
    left join attendance a on a.event_id = e.id and a.character_id = c.id
    where e.starts_at >= c.joined_at or a.character_id is not null
    group by c.id
  ),
  dkp as (
    select character_id, sum(amount)::int as balance from dkp_ledger group by character_id
  )`;

const STATS_SELECT = `
  ${CHARACTER_COLUMNS},
  coalesce(dkp.balance, 0) as dkp,
  coalesce(s.attended, 0) as attended,
  coalesce(s.eligible, 0) as eligible`;

function withPct<T extends { attended: number; eligible: number }>(r: T) {
  return { ...r, attendancePct: r.eligible > 0 ? Math.round((r.attended / r.eligible) * 100) : null };
}

export type RosterFilters = { class?: string; role?: string; ruleset?: string; status?: string };

export async function listCharacters(filters: RosterFilters = {}): Promise<CharacterWithStats[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  for (const key of ["class", "role", "ruleset", "status"] as const) {
    const v = filters[key];
    if (v) {
      params.push(v);
      where.push(`c.${key} = $${params.length}`);
    }
  }
  const rows = await query<Omit<CharacterWithStats, "attendancePct">>(
    `with ${ATTENDANCE_STATS_CTE}
     select ${STATS_SELECT}
     from characters c
     left join members m on m.id = c.member_id
     left join att_stats s on s.character_id = c.id
     left join dkp on dkp.character_id = c.id
     ${where.length ? `where ${where.join(" and ")}` : ""}
     order by (c.status = 'inactive'), c.is_main desc, m.name nulls last, c.first_name`,
    params,
  );
  return rows.map(withPct);
}

export async function getCharacter(identity: CharacterIdentity): Promise<CharacterWithStats | null> {
  const row = await one<Omit<CharacterWithStats, "attendancePct">>(
    `with ${ATTENDANCE_STATS_CTE}
     select ${STATS_SELECT}
     from characters c
     left join members m on m.id = c.member_id
     left join att_stats s on s.character_id = c.id
     left join dkp on dkp.character_id = c.id
     where c.region = $1 and c.ruleset = $2
       and lower(c.first_name) = lower($3) and lower(c.second_name) = lower($4)`,
    [identity.region, identity.ruleset, identity.firstName, identity.secondName],
  );
  return row ? withPct(row) : null;
}

export async function getCharacterById(id: string): Promise<Character | null> {
  return one<Character>(
    `select ${CHARACTER_COLUMNS} from characters c left join members m on m.id = c.member_id where c.id = $1`,
    [id],
  );
}

/** Lightweight list for pickers (signups, loot, attendance). */
export async function characterOptions(includeInactive = false) {
  return query<
    Pick<Character, "id" | "firstName" | "secondName" | "class" | "role" | "status" | "isMain" | "region" | "ruleset"> & {
      memberName: string | null;
    }
  >(
    `select c.id, c.first_name as "firstName", c.second_name as "secondName", c.class, c.role, c.status,
            c.is_main as "isMain", c.region, c.ruleset, m.name as "memberName"
     from characters c left join members m on m.id = c.member_id
     where $1::boolean or c.status <> 'inactive'
     order by m.name nulls last, c.is_main desc, c.first_name`,
    [includeInactive],
  );
}

export async function listMembers() {
  return query<{ id: string; name: string; characters: number }>(
    `select m.id, m.name, count(c.id)::int as characters
     from members m left join characters c on c.member_id = m.id
     group by m.id order by m.name`,
  );
}

export type CharacterInput = CharacterIdentity & {
  memberName: string;
  class: ClassId;
  race: RaceId;
  role: Role;
  isMain: boolean;
  status: CharacterStatus;
  level: number | null;
  notes: string | null;
};

async function upsertMember(q: Sql, name: string): Promise<string | null> {
  const n = name.trim();
  if (!n) return null;
  const rows = await q.query<{ id: string }>(
    `insert into members (name) values ($1)
     on conflict (lower(name)) do update set name = members.name
     returning id`,
    [n],
  );
  return rows[0].id;
}

async function enforceSingleMain(q: Sql, memberId: string | null, characterId: string, isMain: boolean) {
  if (memberId && isMain) {
    await q.query(`update characters set is_main = false where member_id = $1 and id <> $2`, [memberId, characterId]);
  }
}

export async function createCharacter(input: CharacterInput) {
  const { startingBalance } = await getDkpSettings();
  return tx(async (q) => {
    const memberId = await upsertMember(q, input.memberName);
    const [row] = await q.query<{ id: string }>(
      `insert into characters (member_id, first_name, second_name, region, ruleset, class, race, role, is_main, status, level, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id`,
      [
        memberId,
        input.firstName,
        input.secondName,
        input.region,
        input.ruleset,
        input.class,
        input.race,
        input.role,
        input.isMain,
        input.status,
        input.level,
        input.notes,
      ],
    );
    await enforceSingleMain(q, memberId, row.id, input.isMain);
    if (startingBalance !== 0) {
      await q.query(
        `insert into dkp_ledger (character_id, kind, amount, reason) values ($1, 'start', $2, 'Starting DKP')`,
        [row.id, startingBalance],
      );
    }
    return row.id;
  });
}

export async function updateCharacter(id: string, input: CharacterInput) {
  return tx(async (q) => {
    const memberId = await upsertMember(q, input.memberName);
    await q.query(
      `update characters set member_id=$2, first_name=$3, second_name=$4, region=$5, ruleset=$6, class=$7, race=$8,
         role=$9, is_main=$10, status=$11, level=$12, notes=$13, updated_at=now()
       where id = $1`,
      [
        id,
        memberId,
        input.firstName,
        input.secondName,
        input.region,
        input.ruleset,
        input.class,
        input.race,
        input.role,
        input.isMain,
        input.status,
        input.level,
        input.notes,
      ],
    );
    await enforceSingleMain(q, memberId, id, input.isMain);
  });
}

export async function deleteCharacter(id: string) {
  await query(`delete from characters where id = $1`, [id]);
}

export type { Region, Ruleset };
