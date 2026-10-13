// Apply supabase/migrations/*.sql to DATABASE_URL (your Supabase project).
//   npm run db:migrate
// Locally (no DATABASE_URL) the app migrates its embedded database on boot.
import postgres from "postgres";
import { runMigrations } from "../src/lib/db/migrate";

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
runMigrations(
  {
    exec: async (s) => {
      await sql.unsafe(s);
    },
    query: async <T,>(s: string, p: unknown[] = []) => (await sql.unsafe(s, p as never[])) as unknown as T[],
  },
  (m) => console.log(m),
)
  .then(() => console.log("Migrations up to date."))
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
