// End-to-end test of the namespace probe against a mock Battle.net.
// Run from the project root:
//   npm run test:probe
import http from "node:http";
import { rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PORT = 4599;
let scenario: "none" | "static" | "profile" = "none";
const hits: string[] = [];

const server = http.createServer((req, res) => {
  const url = new URL(req.url!, `http://localhost:${PORT}`);
  hits.push(`${req.method} ${url.pathname}?${url.searchParams.get("namespace") ?? ""}`);
  const json = (code: number, body: unknown) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (url.pathname === "/token") return json(200, { access_token: "tkn", expires_in: 3600 });
  if (req.headers.authorization !== "Bearer tkn") return json(401, {});
  const ns = url.searchParams.get("namespace");
  if (url.pathname === "/data/wow/playable-class/index") {
    if (ns === "static-classic1x-us") return json(200, { classes: [] });
    if (ns === "static-forever-us" && scenario !== "none") return json(200, { classes: [] });
    return json(404, {});
  }
  if (scenario === "profile" && ns === "profile-forever-us") {
    const base = "/profile/wow/character/normal/grenna-ironvow";
    if (url.pathname === base) return json(200, { id: 4242, level: 60, equipped_item_level: 71 });
    if (url.pathname === `${base}/character-media`) return json(200, { assets: [{ key: "avatar", value: "https://render.example/grenna.jpg" }] });
    if (url.pathname === `${base}/equipment`)
      return json(200, { equipped_items: [{ slot: { type: "HEAD" }, name: "Lionheart Helm", item: { id: 12640 }, quality: { type: "EPIC" } }] });
  }
  return json(404, {});
});

async function main() {
  await new Promise<void>((r) => server.listen(PORT, r));
  const dbDir = path.join(process.cwd(), ".data", "probe-test");
  rmSync(dbDir, { recursive: true, force: true });
  Object.assign(process.env, {
    LOCAL_DB_DIR: dbDir,
    BLIZZARD_CLIENT_ID: "id",
    BLIZZARD_CLIENT_SECRET: "secret",
    BLIZZARD_TOKEN_URL: `http://localhost:${PORT}/token`,
    BLIZZARD_API_BASE: `http://localhost:${PORT}`,
  });
  delete process.env.DATABASE_URL;

  const root = process.cwd();
  const { query } = await import(pathToFileURL(path.join(root, "src/lib/db/index.ts")).href);
  const api = await import(pathToFileURL(path.join(root, "src/api/index.ts")).href);

  const results: Record<string, unknown> = {};
  const assert = (cond: unknown, msg: string) => {
    if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
    console.log(`  ok  ${msg}`);
  };

  // Scenario 0: empty roster, nothing live
  scenario = "none";
  let r = await api.runProbe();
  assert(r.status === "no_namespace_yet", "no namespace → no_namespace_yet");
  assert(r.checks.find((c: { label: string }) => c.label === "control")?.ok, "control namespace answered");
  assert(!(await api.isBlizzardSyncEnabled()), "sync stays dark");
  assert("dark" in (await api.syncAll()), "syncAll is a no-op while dark");

  // Scenario 1: static game data appears, no profiles
  await query(
    `insert into characters (first_name, second_name, region, ruleset, class, race, role, status) values ('Grenna','Ironvow','us','normal','warrior','dwarf','tank','active')`,
  );
  scenario = "static";
  r = await api.runProbe();
  assert(r.status === "static_only", "static namespace → static_only");
  assert(!(await api.isBlizzardSyncEnabled()), "sync still dark on static_only");
  let news = await query(`select title from announcements where author = 'API probe'`);
  assert(news.length === 1, "static_only posted one notice");
  await api.runProbe();
  news = await query(`select title from announcements where author = 'API probe'`);
  assert(news.length === 1, "repeat static_only does not re-notify");

  // Scenario 2: profile namespace goes live
  scenario = "profile";
  r = await api.runProbe();
  assert(r.status === "namespace_detected", "profile found → namespace_detected");
  assert(r.discovered?.profilePathTemplate === "/profile/wow/character/{ruleset}/{first}-{second}", "discovered realmless path template");
  assert(await api.isBlizzardSyncEnabled(), "flag flipped on by probe");
  news = await query(`select title from announcements where author = 'API probe' order by created_at`);
  assert(news.length === 2, "detection posted a notice");
  const status = await api.getApiStatus();
  assert(status.status === "namespace_detected" && status.flag.source === "probe", "status endpoint reports detected + flag source=probe");

  const sync = await api.syncAll();
  assert("results" in sync && sync.results.every((x: { ok: boolean }) => x.ok), "syncAll succeeded");
  const [c] = await query(
    `select api_id::text, api_level, api_item_level, portrait_url, equipment, status from characters where first_name='Grenna'`,
  );
  results.synced = c;
  assert(c.api_item_level === 71 && c.portrait_url === "https://render.example/grenna.jpg", "profile/media mapped onto character");

  // Kill switch
  process.env.BLIZZARD_SYNC_DISABLED = "1";
  assert(!(await api.isBlizzardSyncEnabled()), "env kill switch overrides the flag");
  delete process.env.BLIZZARD_SYNC_DISABLED;

  console.log(JSON.stringify(results, null, 2));
  console.log(`mock hits: ${hits.length}`);
}

main()
  .then(() => console.log("PROBE TEST PASSED"))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => server.close());
