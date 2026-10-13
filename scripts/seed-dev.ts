// Local-dev test data so the sky has roster lights and signups to show.
//   npm run db:seed-dev   (stop the dev server first — the embedded DB is single-process)
// Fictional names; refuses to run against a real DATABASE_URL.
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const imp = (p: string) => import(pathToFileURL(path.join(root, p)).href);

async function main() {
  for (const f of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(f);
    } catch {}
  }
  if (process.env.DATABASE_URL) throw new Error("db:seed-dev only runs against the local embedded database.");
  const { createCharacter } = await imp("src/lib/data/roster.ts");
  const { createEvent, upsertSignup } = await imp("src/lib/data/events.ts");
  const { query } = await imp("src/lib/db/index.ts");

  const chars = [
    ["Ashvale", "Brightwhisper", "priest", "skyborne", "healer", true, "planned", "Brandon"],
    ["Pip", "Cogsworth", "mage", "gnome", "dps", false, "planned", "Brandon"],
    ["Grenna", "Ironvow", "warrior", "dwarf", "tank", true, "planned", "Coworker"],
    ["Thessaly", "Moonfall", "druid", "nightelf", "healer", true, "planned", "Wife"],
    ["Korrin", "Ashmantle", "warlock", "human", "dps", false, "planned", "Coworker"],
    ["Vael", "Duskwhisper", "rogue", "nightelf", "dps", false, "planned", "Wife"],
    ["Odric", "Stonehelm", "paladin", "dwarf", "tank", false, "planned", "Brandon"],
    ["Mirelle", "Swiftarrow", "hunter", "nightelf", "dps", false, "planned", "Wife"],
  ] as const;
  const ids: string[] = [];
  for (const [f, s, cls, race, role, isMain, status, member] of chars) {
    const existing = await query(`select id from characters where lower(first_name)=lower($1) and lower(second_name)=lower($2)`, [f, s]);
    if (existing.length) {
      ids.push((existing[0] as { id: string }).id);
      continue;
    }
    ids.push(
      await createCharacter({ firstName: f, secondName: s, region: "us", ruleset: "normal", class: cls, race, role, isMain, status, level: null, notes: null, memberName: member }),
    );
  }

  const evs = await query(`select id from events`);
  if (!evs.length) {
    const ony = await createEvent({ title: "Onyxia's Lair", kind: "raid", raidId: "onyxias-lair", ruleset: null, startsAt: new Date("2026-12-10T01:00:00Z"), durationMinutes: 180, capacity: 40, description: null, countsForAttendance: true });
    const hyj = await createEvent({ title: "Hyjal Summit", kind: "raid", raidId: "hyjal-summit", ruleset: null, startsAt: new Date("2026-12-11T01:00:00Z"), durationMinutes: 180, capacity: 20, description: null, countsForAttendance: true });
    await createEvent({ title: "Dungeon night", kind: "dungeon", raidId: null, ruleset: null, startsAt: new Date("2026-11-07T01:00:00Z"), durationMinutes: 150, capacity: 5, description: null, countsForAttendance: false });
    const roles = ["healer", "dps", "tank", "healer", "dps", "dps", "tank", "dps"] as const;
    for (let i = 0; i < ids.length; i++) {
      await upsertSignup({ eventId: ony, characterId: ids[i], status: i < 6 ? "yes" : "maybe", role: roles[i], note: null });
      if (i % 2 === 0) await upsertSignup({ eventId: hyj, characterId: ids[i], status: "yes", role: roles[i], note: null });
    }
  }
  console.log(`seeded ${ids.length} characters`);
}
main().then(() => process.exit(0));
