import "server-only";
import { query, one, tx } from "@/lib/db";
import type { ClassId, RaceId, Ruleset } from "@/config/guild";
import { apiGet, ns } from "./client";
import { blizzardConfig, fillTemplate } from "./config";
import { savedApiShape, type ApiShape } from "./probe";

// Character + guild sync. Dark until the probe saves an ApiShape and flips the
// flag (the facade in src/api/index.ts checks the flag before calling in).
//
// Response mapping follows the Classic profile API shapes (level,
// equipped_item_level, character-media assets, equipment.equipped_items).
// Forever may differ — verify against real payloads when the namespace lands.

type Profile = {
  id?: number;
  level?: number;
  equipped_item_level?: number;
  average_item_level?: number;
};
type Media = { assets?: { key: string; value: string }[]; avatar_url?: string };
type Equipment = {
  equipped_items?: { slot?: { type?: string }; name?: string; item?: { id?: number }; quality?: { type?: string } }[];
};

export type SyncResult = { characterId: string; ok: boolean; status?: number; error?: string };

async function requireShape(): Promise<ApiShape> {
  const shape = await savedApiShape();
  if (!shape) throw new Error("No discovered API shape — run the namespace probe first.");
  return shape;
}

export async function syncCharacterById(id: string): Promise<SyncResult> {
  const shape = await requireShape();
  const cfg = blizzardConfig();
  const c = await one<{ firstName: string; secondName: string; ruleset: Ruleset; region: string }>(
    `select first_name as "firstName", second_name as "secondName", ruleset, region from characters where id = $1`,
    [id],
  );
  if (!c) return { characterId: id, ok: false, error: "not found" };
  if (c.region !== shape.region) return { characterId: id, ok: false, error: `region ${c.region} not probed` };

  const namespace = ns("profile", shape.tag, cfg);
  const base = fillTemplate(shape.profilePathTemplate, c);
  const profile = await apiGet<Profile>(base, namespace, cfg);
  if (!profile.ok || !profile.data) return { characterId: id, ok: false, status: profile.status };

  const [media, equipment] = await Promise.all([
    apiGet<Media>(`${base}/character-media`, namespace, cfg).catch(() => null),
    apiGet<Equipment>(`${base}/equipment`, namespace, cfg).catch(() => null),
  ]);
  const portrait =
    media?.data?.assets?.find((a) => a.key === "avatar")?.value ??
    media?.data?.assets?.find((a) => a.key === "inset")?.value ??
    media?.data?.avatar_url ??
    null;
  const items =
    equipment?.data?.equipped_items?.map((i) => ({
      slot: i.slot?.type ?? null,
      name: i.name ?? null,
      itemId: i.item?.id ?? null,
      quality: i.quality?.type?.toLowerCase() ?? null,
    })) ?? null;

  await query(
    `update characters set api_id = $2, api_level = $3, api_item_level = $4,
       portrait_url = coalesce($5, portrait_url), equipment = coalesce($6::jsonb, equipment),
       level = coalesce($3, level), api_synced_at = now(), updated_at = now(),
       status = case when status = 'planned' then 'active' else status end
     where id = $1`,
    [
      id,
      profile.data.id ?? null,
      profile.data.level ?? null,
      profile.data.equipped_item_level ?? profile.data.average_item_level ?? null,
      portrait,
      items ? JSON.stringify(items) : null,
    ],
  );
  return { characterId: id, ok: true };
}

export async function syncAllCharacters(): Promise<SyncResult[]> {
  const rows = await query<{ id: string }>(`select id from characters where status <> 'inactive'`);
  const results: SyncResult[] = [];
  for (const r of rows) {
    results.push(await syncCharacterById(r.id).catch((e) => ({ characterId: r.id, ok: false, error: String(e) })));
  }
  return results;
}

// Classic playable-class / playable-race ids. Skyborne's id is unknown yet.
const CLASS_BY_ID: Record<number, ClassId> = {
  1: "warrior", 2: "paladin", 3: "hunter", 4: "rogue", 5: "priest", 7: "shaman", 8: "mage", 9: "warlock", 11: "druid",
};
const RACE_BY_ID: Record<number, RaceId> = {
  1: "human", 2: "orc", 3: "dwarf", 4: "nightelf", 5: "undead", 6: "tauren", 7: "gnome", 8: "troll",
};

type GuildRoster = {
  members?: {
    character?: { name?: string; level?: number; playable_class?: { id?: number }; playable_race?: { id?: number } };
  }[];
};

/**
 * Import the in-game guild roster. Path template is a guess
 * (BLIZZARD_GUILD_ROSTER_PATH, placeholder {guild}); new characters land as
 * active DPS alts with no player — officers tidy roles/mains after.
 */
export async function importGuildRoster(guildSlug: string, ruleset: Ruleset) {
  const shape = await requireShape();
  const cfg = blizzardConfig();
  const tpl = process.env.BLIZZARD_GUILD_ROSTER_PATH ?? "/data/wow/guild/{guild}/roster";
  const res = await apiGet<GuildRoster>(
    tpl.replace("{guild}", encodeURIComponent(guildSlug.toLowerCase())),
    ns("profile", shape.tag, cfg),
    cfg,
  );
  if (!res.ok || !res.data) return { ok: false, status: res.status, imported: 0, skipped: 0 };

  let imported = 0;
  let skipped = 0;
  await tx(async (q) => {
    for (const m of res.data!.members ?? []) {
      const [firstName, secondName] = (m.character?.name ?? "").trim().split(/\s+/);
      const cls = CLASS_BY_ID[m.character?.playable_class?.id ?? -1];
      if (!firstName || !secondName || !cls) {
        skipped++;
        continue;
      }
      const race = RACE_BY_ID[m.character?.playable_race?.id ?? -1] ?? "skyborne";
      const rows = await q.query(
        `insert into characters (first_name, second_name, region, ruleset, class, race, role, is_main, status, level)
         values ($1, $2, $3, $4, $5, $6, 'dps', false, 'active', $7)
         on conflict (region, lower(first_name), lower(second_name)) do nothing returning id`,
        [firstName, secondName, shape.region, ruleset, cls, race, m.character?.level ?? null],
      );
      if (rows.length) imported++;
      else skipped++;
    }
  });
  return { ok: true, status: res.status, imported, skipped };
}
