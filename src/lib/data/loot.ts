import "server-only";
import { query, tx } from "@/lib/db";
import type { ClassId, ItemQuality, Ruleset } from "@/config/guild";
import { getDkpSettings } from "./settings";

export type LootEntry = {
  id: string;
  itemName: string;
  itemId: number | null;
  quality: ItemQuality;
  dkpCost: number;
  councilNote: string | null;
  awardedAt: Date;
  characterId: string;
  firstName: string;
  secondName: string;
  region: string;
  ruleset: Ruleset;
  class: ClassId;
  eventId: string | null;
  eventTitle: string | null;
  bossName: string | null;
};

const LOOT_SELECT = `
  select l.id, l.item_name as "itemName", l.item_id as "itemId", l.quality, l.dkp_cost as "dkpCost",
         l.council_note as "councilNote", l.awarded_at as "awardedAt",
         c.id as "characterId", c.first_name as "firstName", c.second_name as "secondName", c.region, c.ruleset, c.class,
         e.id as "eventId", e.title as "eventTitle", b.name as "bossName"
  from loot l
  join characters c on c.id = l.character_id
  left join events e on e.id = l.event_id
  left join bosses b on b.id = l.boss_id`;

export async function listLoot(limit = 100): Promise<LootEntry[]> {
  return query<LootEntry>(`${LOOT_SELECT} order by l.awarded_at desc limit $1`, [limit]);
}

export async function characterLoot(characterId: string): Promise<LootEntry[]> {
  return query<LootEntry>(`${LOOT_SELECT} where l.character_id = $1 order by l.awarded_at desc`, [characterId]);
}

export type LootInput = {
  characterId: string;
  itemName: string;
  itemId: number | null;
  quality: ItemQuality;
  dkpCost: number;
  councilNote: string | null;
  eventId: string | null;
  bossId: string | null;
  awardedAt: Date;
};

export async function recordLoot(l: LootInput) {
  await tx(async (q) => {
    const [row] = await q.query<{ id: string }>(
      `insert into loot (character_id, item_name, item_id, quality, dkp_cost, council_note, event_id, boss_id, awarded_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
      [l.characterId, l.itemName, l.itemId, l.quality, l.dkpCost, l.councilNote, l.eventId, l.bossId, l.awardedAt],
    );
    if (l.dkpCost > 0) {
      await q.query(
        `insert into dkp_ledger (character_id, kind, amount, reason, loot_id, created_at) values ($1, 'loot', $2, $3, $4, $5)`,
        [l.characterId, -l.dkpCost, l.itemName, row.id, l.awardedAt],
      );
    }
  });
}

/** Deleting a loot row refunds its DKP (ledger row cascades). */
export async function deleteLoot(id: string) {
  await query(`delete from loot where id = $1`, [id]);
}

export type DkpStanding = {
  characterId: string;
  firstName: string;
  secondName: string;
  region: string;
  ruleset: Ruleset;
  class: ClassId;
  status: string;
  balance: number;
  earned: number;
  spent: number;
  decayed: number;
  lastChange: Date | null;
};

export async function dkpStandings(): Promise<DkpStanding[]> {
  return query<DkpStanding>(
    `select c.id as "characterId", c.first_name as "firstName", c.second_name as "secondName", c.region, c.ruleset,
            c.class, c.status,
            coalesce(sum(d.amount), 0)::int as balance,
            coalesce(sum(d.amount) filter (where d.amount > 0), 0)::int as earned,
            coalesce(-sum(d.amount) filter (where d.kind = 'loot'), 0)::int as spent,
            coalesce(-sum(d.amount) filter (where d.kind = 'decay'), 0)::int as decayed,
            max(d.created_at) as "lastChange"
     from characters c left join dkp_ledger d on d.character_id = c.id
     where c.status <> 'inactive'
     group by c.id
     order by balance desc, c.first_name`,
  );
}

/** Apply the configured % decay to every positive balance. Returns rows written. */
export async function applyDecay(): Promise<{ affected: number; percent: number }> {
  const { decayPercent } = await getDkpSettings();
  if (!decayPercent) return { affected: 0, percent: 0 };
  const rows = await query<{ id: string }>(
    `insert into dkp_ledger (character_id, kind, amount, reason)
     select character_id, 'decay', -floor(sum(amount) * $1::numeric / 100)::int, $2
     from dkp_ledger group by character_id
     having floor(sum(amount) * $1::numeric / 100) > 0
     returning id`,
    [decayPercent, `${decayPercent}% decay`],
  );
  return { affected: rows.length, percent: decayPercent };
}

export async function adjustDkp(characterId: string, amount: number, reason: string) {
  await query(`insert into dkp_ledger (character_id, kind, amount, reason) values ($1, 'adjust', $2, $3)`, [
    characterId,
    amount,
    reason,
  ]);
}

export async function characterLedger(characterId: string, limit = 25) {
  return query<{ id: string; kind: string; amount: number; reason: string | null; createdAt: Date }>(
    `select id, kind, amount, reason, created_at as "createdAt" from dkp_ledger
     where character_id = $1 order by created_at desc limit $2`,
    [characterId, limit],
  );
}
