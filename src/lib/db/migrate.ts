import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// Minimal migration runner shared by the app (embedded local DB) and
// `npm run db:migrate` (Supabase). Applies supabase/migrations/*.sql in order.

export type Executor = {
  exec(sql: string): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
};

export const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

export async function runMigrations(db: Executor, log: (msg: string) => void = () => {}) {
  await db.exec(`
    create table if not exists app_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
    alter table app_migrations enable row level security;
  `);
  const applied = new Set(
    (await db.query<{ name: string }>("select name from app_migrations")).map((r) => r.name),
  );
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    try {
      await db.exec(`begin;\n${sql}\ninsert into app_migrations (name) values ('${file.replace(/'/g, "''")}');\ncommit;`);
    } catch (err) {
      await db.exec("rollback").catch(() => {});
      throw new Error(`migration ${file} failed: ${(err as Error).message}`);
    }
    log(`applied ${file}`);
  }
}
