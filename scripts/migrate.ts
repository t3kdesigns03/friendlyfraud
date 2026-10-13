// Apply the schema to DATABASE_URL (your Supabase project) by hand.
//   npm run db:migrate
// Not required: the app also migrates on first boot (DB_AUTO_MIGRATE=0 turns
// that off). Locally (no DATABASE_URL) the embedded database migrates itself.
import postgres from "postgres";
import { applyMigrations, MIGRATION_LOCK } from "../src/lib/db/migrate";

for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(f);
  } catch {}
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (checked env, .env.local, .env).");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
sql
  .begin(async (t) => {
    await t.unsafe(`select pg_advisory_xact_lock(${MIGRATION_LOCK})`);
    await applyMigrations(
      {
        exec: async (s) => {
          await t.unsafe(s);
        },
        query: async <T,>(s: string, p: unknown[] = []) => (await t.unsafe(s, p as never[])) as unknown as T[],
      },
      (m) => console.log(m),
    );
  })
  .then(() => console.log("Migrations up to date."))
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
