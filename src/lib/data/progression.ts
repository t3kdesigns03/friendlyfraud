import "server-only";
import { query } from "@/lib/db";

export type BossProgress = {
  id: string;
  name: string;
  sort: number;
  kills: number;
  firstKillAt: Date | null;
  lastKillAt: Date | null;
};

export type RaidProgress = {
  id: string;
  name: string;
  size: number;
  unlockDate: string | null;
  description: string | null;
  bosses: BossProgress[];
};

export async function getProgression(): Promise<RaidProgress[]> {
  const raids = await query<Omit<RaidProgress, "bosses">>(
    `select id, name, size, to_char(unlock_date, 'YYYY-MM-DD') as "unlockDate", description from raids order by sort, name`,
  );
  const bosses = await query<BossProgress & { raidId: string }>(
    `select b.id, b.raid_id as "raidId", b.name, b.sort,
            count(k.id)::int as kills, min(k.killed_at) as "firstKillAt", max(k.killed_at) as "lastKillAt"
     from bosses b left join boss_kills k on k.boss_id = b.id
     group by b.id order by b.sort, b.name`,
  );
  return raids.map((r) => ({ ...r, bosses: bosses.filter((b) => b.raidId === r.id) }));
}

export async function raidOptions() {
  return query<{ id: string; name: string; size: number }>(`select id, name, size from raids order by sort`);
}

export async function bossOptions() {
  return query<{ id: string; name: string; raidName: string }>(
    `select b.id, b.name, r.name as "raidName" from bosses b join raids r on r.id = b.raid_id order by r.sort, b.sort`,
  );
}

export async function addBoss(raidId: string, name: string) {
  await query(
    `insert into bosses (raid_id, name, sort)
     values ($1, $2, coalesce((select max(sort) + 1 from bosses where raid_id = $1), 1))`,
    [raidId, name],
  );
}

export async function renameBoss(id: string, name: string) {
  await query(`update bosses set name = $2 where id = $1`, [id, name]);
}

export async function deleteBoss(id: string) {
  await query(`delete from bosses where id = $1`, [id]);
}

export async function moveBoss(id: string, dir: -1 | 1) {
  // Swap sort with the neighbour in the same raid.
  await query(
    `with me as (select id, raid_id, sort from bosses where id = $1),
     other as (
       select b.id, b.sort from bosses b, me
       where b.raid_id = me.raid_id and b.id <> me.id and ${dir < 0 ? "b.sort <= me.sort" : "b.sort >= me.sort"}
       order by b.sort ${dir < 0 ? "desc" : "asc"} limit 1
     )
     update bosses set sort = case when bosses.id = (select id from me) then (select sort from other)
                                   else (select sort from me) end
     where bosses.id in ((select id from me), (select id from other))
       and exists (select 1 from other)`,
    [id],
  );
}

export async function recordKill(bossId: string, killedAt: Date, eventId: string | null, note: string | null) {
  await query(`insert into boss_kills (boss_id, killed_at, event_id, note) values ($1, $2, $3, $4)`, [
    bossId,
    killedAt,
    eventId,
    note,
  ]);
}

export async function undoLastKill(bossId: string) {
  await query(
    `delete from boss_kills where id = (select id from boss_kills where boss_id = $1 order by killed_at desc limit 1)`,
    [bossId],
  );
}
