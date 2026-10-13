import "server-only";
import { listAnnouncements } from "@/lib/data/announcements";
import { listEvents } from "@/lib/data/events";
import { query } from "@/lib/db";
import { getSceneData } from "@/lib/scene/data";
import { characterPath, displayName } from "@/lib/identity";
import { CLASSES, type ClassId, type ItemQuality, type Ruleset } from "@/config/guild";
import { fmtDate, fmtShortDate, fmtTime } from "@/lib/time";
import type { SceneData } from "@/lib/scene/types";

export type GalaxyLoot = { item: string; quality: ItemQuality; who: string; color: string; path: string; when: string };

export type GalaxyData = {
  scene: SceneData;
  /** recent loot per raid id */
  loot: Record<string, GalaxyLoot[]>;
  crest: {
    characters: number;
    mains: number;
    planned: number;
    players: number;
    next: { id: string; title: string; when: string; yes: number } | null;
    news: { title: string; when: string }[];
  };
};

/** Everything the galaxy panels show, straight from the guild database. */
export async function getGalaxyData(): Promise<GalaxyData> {
  const [scene, upcoming, news, lootRows] = await Promise.all([
    getSceneData(),
    listEvents("upcoming", 1),
    listAnnouncements(3),
    query<{
      raidId: string | null;
      item: string;
      quality: ItemQuality;
      firstName: string;
      secondName: string;
      region: string;
      ruleset: Ruleset;
      cls: ClassId;
      awardedAt: Date;
    }>(
      `select coalesce(e.raid_id, b.raid_id) as "raidId", l.item_name as item, l.quality,
              c.first_name as "firstName", c.second_name as "secondName", c.region, c.ruleset, c.class as cls,
              l.awarded_at as "awardedAt"
       from loot l
       join characters c on c.id = l.character_id
       left join events e on e.id = l.event_id
       left join bosses b on b.id = l.boss_id
       where coalesce(e.raid_id, b.raid_id) is not null
       order by l.awarded_at desc
       limit 60`,
    ),
  ]);

  const loot: Record<string, GalaxyLoot[]> = {};
  for (const r of lootRows) {
    const list = (loot[r.raidId!] ??= []);
    if (list.length >= 4) continue;
    list.push({
      item: r.item,
      quality: r.quality,
      who: displayName(r),
      color: CLASSES[r.cls]?.color ?? "#fff",
      path: characterPath({ firstName: r.firstName, secondName: r.secondName, region: r.region as "us", ruleset: r.ruleset }),
      when: fmtShortDate(r.awardedAt),
    });
  }

  const next = upcoming[0];
  return {
    scene,
    loot,
    crest: {
      characters: scene.characters.length,
      mains: scene.characters.filter((c) => c.isMain).length,
      planned: scene.characters.filter((c) => c.planned).length,
      players: new Set(scene.characters.map((c) => c.memberName).filter(Boolean)).size,
      next: next ? { id: next.id, title: next.title, when: `${fmtDate(next.startsAt)} · ${fmtTime(next.startsAt)}`, yes: next.yes } : null,
      news: news.map((a) => ({ title: a.title, when: fmtShortDate(a.createdAt) })),
    },
  };
}
