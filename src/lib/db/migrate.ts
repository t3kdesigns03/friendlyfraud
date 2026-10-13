import { MIGRATIONS } from "./migrations.generated";

// Migration runner shared by the app (embedded local DB, and Supabase on
// first boot) and `npm run db:migrate`. The SQL in supabase/migrations is
// embedded at build time (scripts/gen-migrations.mjs) so serverless hosts
// don't need the files on disk.

export type Executor = {
  exec(sql: string): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
};

/** Apply any pending migrations. Call inside a single transaction. */
export async function applyMigrations(db: Executor, log: (msg: string) => void = () => {}) {
  await db.exec(`
    create table if not exists app_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
    alter table app_migrations enable row level security;
  `);
  const applied = new Set((await db.query<{ name: string }>("select name from app_migrations")).map((r) => r.name));
  for (const m of MIGRATIONS) {
    if (applied.has(m.name)) continue;
    try {
      await db.exec(m.sql);
    } catch (err) {
      throw new Error(`migration ${m.name} failed: ${(err as Error).message}`);
    }
    await db.query("insert into app_migrations (name) values ($1)", [m.name]);
    log(`applied ${m.name}`);
  }
}

/** Arbitrary constant for pg_advisory_xact_lock: one migrator at a time. */
export const MIGRATION_LOCK = 7270011;
