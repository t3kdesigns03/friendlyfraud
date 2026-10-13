import "server-only";
import { CLASSES } from "@/config/guild";
import { listEvents } from "@/lib/data/events";
import { getProgression } from "@/lib/data/progression";
import { listCharacters } from "@/lib/data/roster";
import { characterPath, displayName } from "@/lib/identity";
import { fmtDate, fmtTime } from "@/lib/time";
import type { SceneData } from "./types";

/** Live roster + raids + next signups, shaped for the 3D layer. */
export async function getSceneData(): Promise<SceneData> {
  const [raids, upcoming, characters] = await Promise.all([
    getProgression(),
    listEvents("upcoming", 40),
    listCharacters(),
  ]);
  return {
    raids: raids.map((r) => {
      const next = upcoming.find((e) => e.raidId === r.id) ?? null;
      return {
        id: r.id,
        name: r.name,
        size: r.size,
        unlockDate: r.unlockDate,
        killed: r.bosses.filter((b) => b.kills > 0).length,
        total: r.bosses.length,
        bosses: r.bosses.map((b) => ({ name: b.name, killed: b.kills > 0 })),
        next: next
          ? {
              id: next.id,
              title: next.title,
              when: `${fmtDate(next.startsAt)} · ${fmtTime(next.startsAt)}`,
              yes: next.yes,
              maybe: next.maybe,
              cap: next.capacity ?? next.raidSize,
            }
          : null,
      };
    }),
    characters: characters
      .filter((c) => c.status !== "inactive")
      .map((c) => ({
        id: c.id,
        name: displayName(c),
        cls: c.class,
        className: CLASSES[c.class]?.name ?? c.class,
        color: CLASSES[c.class]?.color ?? "#ffffff",
        role: c.role,
        isMain: c.isMain,
        planned: c.status === "planned",
        memberName: c.memberName,
        path: characterPath(c),
      })),
  };
}
