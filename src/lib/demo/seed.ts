import type { Sql } from "@/lib/db";

/**
 * Temporary placeholder guild so the bones deploy has something to show:
 * roster, calendar + signups, a past raid night with attendance, loot and
 * DKP, and progression. Only ever runs on the embedded (temporary) database
 * when it is empty — never against Supabase unless DEMO_DATA=1 — and flags
 * itself in guild_settings so the site can say "sample data".
 *
 * All names are fictional placeholders.
 */

export function demoSeedEnabled() {
  if (process.env.DEMO_DATA === "0") return false;
  if (process.env.DEMO_DATA === "1") return true;
  return !process.env.DATABASE_URL;
}

type Char = [first: string, second: string, cls: string, race: string, role: string, main: boolean, status: string, player: string, ruleset?: string];

const CHARS: Char[] = [
  ["Ashvale", "Brightwhisper", "priest", "skyborne", "healer", true, "active", "Fraudmaster"],
  ["Pip", "Cogsworth", "mage", "gnome", "dps", false, "planned", "Fraudmaster"],
  ["Odric", "Stonehelm", "paladin", "dwarf", "tank", false, "planned", "Fraudmaster"],
  ["Grenna", "Ironvow", "warrior", "dwarf", "tank", true, "active", "Ledgerkeep"],
  ["Korrin", "Ashmantle", "warlock", "human", "dps", false, "planned", "Ledgerkeep"],
  ["Thessaly", "Moonfall", "druid", "nightelf", "healer", true, "active", "Moonbank"],
  ["Vael", "Duskwhisper", "rogue", "nightelf", "dps", false, "planned", "Moonbank"],
  ["Mirelle", "Swiftarrow", "hunter", "nightelf", "dps", false, "active", "Moonbank"],
  ["Liora", "Windmere", "shaman", "skyborne", "dps", true, "planned", "Recruit", "rp"],
  ["Dorn", "Blackpowder", "hunter", "dwarf", "dps", false, "planned", "Recruit", "pvp"],
];

// Times are UTC; 01:00Z is 8 PM Eastern in Nov/Dec, 00:00Z is 8 PM Eastern in Oct.
const EVENTS = [
  { key: "beta", title: "Beta raid night — Onyxia's Lair", kind: "raid", raid: "onyxias-lair", at: "2026-10-09T00:00:00Z", cap: 40, counts: true, desc: "Last beta weekend. Sample event — attendance and loot are placeholders." },
  { key: "launch", title: "Launch night meetup", kind: "social", raid: null, at: "2026-11-05T01:00:00Z", cap: null, counts: false, desc: "Servers up Nov 4. Meet at the starting zone, sort out groups." },
  { key: "dungeon", title: "Dungeon night", kind: "dungeon", raid: null, at: "2026-11-07T01:00:00Z", cap: 5, counts: false, desc: null },
  { key: "ony", title: "Onyxia's Lair", kind: "raid", raid: "onyxias-lair", at: "2026-12-10T01:00:00Z", cap: 40, counts: true, desc: "Unlock night. Fire resist if you have it." },
  { key: "hyjal", title: "Hyjal Summit", kind: "raid", raid: "hyjal-summit", at: "2026-12-11T01:00:00Z", cap: 20, counts: true, desc: null },
  { key: "barrow", title: "Barrow Deeps", kind: "raid", raid: "barrow-deeps", at: "2026-12-12T01:00:00Z", cap: 10, counts: true, desc: null },
] as const;

// [character index, status, role?] per event
const SIGNUPS: Record<string, [number, "yes" | "maybe" | "no"][]> = {
  launch: [[0, "yes"], [3, "yes"], [5, "yes"], [8, "maybe"]],
  dungeon: [[0, "yes"], [3, "yes"], [5, "yes"], [7, "yes"], [1, "maybe"]],
  ony: [[0, "yes"], [3, "yes"], [5, "yes"], [7, "yes"], [2, "yes"], [4, "maybe"], [6, "maybe"], [9, "no"]],
  hyjal: [[0, "yes"], [3, "yes"], [5, "maybe"], [7, "yes"]],
  barrow: [[0, "yes"], [3, "yes"], [5, "yes"], [7, "yes"], [8, "yes"]],
};

const BETA_ATTENDANCE: [number, "present" | "late" | "bench" | "absent"][] = [
  [0, "present"], [3, "present"], [5, "present"], [7, "present"], [1, "late"], [6, "bench"], [4, "absent"],
];

const BETA_LOOT: [number, string, number, string | null][] = [
  [3, "Ring of Binding", 20, null],
  [0, "Sapphiron Drape", 15, null],
  [7, "Deathbringer", 25, "Council: hunter upgrade, rogue passed"],
  [5, "Onyxia Hide Backpack", 0, "Free roll"],
];

const TBA_BOSSES: Record<string, number> = { "barrow-deeps": 3, "hyjal-summit": 4 };

export async function seedDemo(q: Sql, log: (m: string) => void = () => {}) {
  const existing = await q.query<{ n: number }>("select count(*)::int as n from characters");
  if (existing[0]?.n) return;

  const ids: string[] = [];
  for (const [first, second, cls, race, role, main, status, player, ruleset = "normal"] of CHARS) {
    const [m] = await q.query<{ id: string }>(
      `insert into members (name) values ($1) on conflict (lower(name)) do update set name = members.name returning id`,
      [player],
    );
    const [c] = await q.query<{ id: string }>(
      `insert into characters (member_id, first_name, second_name, region, ruleset, class, race, role, is_main, status, joined_at)
       values ($1, $2, $3, 'us', $4, $5, $6, $7, $8, $9, '2026-10-01T00:00:00Z') returning id`,
      [m.id, first, second, ruleset, cls, race, role, main, status],
    );
    ids.push(c.id);
    await q.query(`insert into dkp_ledger (character_id, kind, amount, reason, created_at) values ($1, 'start', 50, 'Starting DKP', '2026-10-01T00:00:00Z')`, [c.id]);
  }

  const ev: Record<string, string> = {};
  for (const e of EVENTS) {
    const [row] = await q.query<{ id: string }>(
      `insert into events (title, kind, raid_id, starts_at, duration_minutes, capacity, description, counts_for_attendance)
       values ($1, $2, $3, $4, 180, $5, $6, $7) returning id`,
      [e.title, e.kind, e.raid, e.at, e.cap, e.desc, e.counts],
    );
    ev[e.key] = row.id;
  }

  for (const [key, list] of Object.entries(SIGNUPS)) {
    for (const [i, status] of list) {
      await q.query(`insert into signups (event_id, character_id, status, role) values ($1, $2, $3, $4)`, [ev[key], ids[i], status, CHARS[i][4]]);
    }
  }

  for (const [i, status] of BETA_ATTENDANCE) {
    await q.query(`insert into attendance (event_id, character_id, status) values ($1, $2, $3)`, [ev.beta, ids[i], status]);
    if (status !== "absent") {
      await q.query(
        `insert into dkp_ledger (character_id, kind, amount, reason, event_id, created_at) values ($1, 'attendance', 10, $2, $3, '2026-10-09T03:00:00Z')`,
        [ids[i], "Attendance: Beta raid night", ev.beta],
      );
    }
  }

  const [ony] = await q.query<{ id: string }>(`select id from bosses where raid_id = 'onyxias-lair' order by sort limit 1`);
  if (ony) {
    await q.query(`insert into boss_kills (boss_id, event_id, killed_at, note) values ($1, $2, '2026-10-09T01:40:00Z', 'Beta kill (sample)')`, [ony.id, ev.beta]);
  }
  for (const [i, item, cost, note] of BETA_LOOT) {
    const [l] = await q.query<{ id: string }>(
      `insert into loot (character_id, event_id, boss_id, item_name, quality, dkp_cost, council_note, awarded_at)
       values ($1, $2, $3, $4, 'epic', $5, $6, '2026-10-09T01:45:00Z') returning id`,
      [ids[i], ev.beta, ony?.id ?? null, item, cost, note],
    );
    if (cost > 0) {
      await q.query(
        `insert into dkp_ledger (character_id, kind, amount, reason, loot_id, created_at) values ($1, 'loot', $2, $3, $4, '2026-10-09T01:45:00Z')`,
        [ids[i], -cost, item, l.id],
      );
    }
  }

  for (const [raid, n] of Object.entries(TBA_BOSSES)) {
    for (let k = 1; k <= n; k++) {
      await q.query(`insert into bosses (raid_id, name, sort) values ($1, $2, $3)`, [raid, `TBA boss ${k}`, k]);
    }
  }

  await q.query(
    `insert into announcements (title, body, pinned, author) values ($1, $2, false, 'Officers')`,
    [
      "Sample data is loaded",
      "Everything on the roster, calendar, loot and progression pages right now is placeholder data so the site has something to show. It goes away when the real database is connected.",
    ],
  );
  await q.query(
    `insert into guild_settings (key, value) values ('sample_data', 'true'::jsonb) on conflict (key) do update set value = excluded.value`,
  );
  log(`seeded sample guild: ${ids.length} characters, ${EVENTS.length} events`);
}
