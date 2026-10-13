import "server-only";
import { runMigrations } from "./migrate";

// One tiny SQL interface over two drivers:
//  - DATABASE_URL set   → Supabase Postgres via postgres.js (production / Netlify)
//  - DATABASE_URL unset → embedded PGlite in ./.data (local dev, auto-migrated)
// Both run the exact same SQL from supabase/migrations.

export type Sql = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};
export type Db = Sql & {
  tx<R>(fn: (q: Sql) => Promise<R>): Promise<R>;
  mode: "supabase" | "local";
};

const g = globalThis as unknown as { __ffDb?: Promise<Db> };

export function db(): Promise<Db> {
  if (!g.__ffDb) {
    g.__ffDb = (process.env.DATABASE_URL ? connectPostgres(process.env.DATABASE_URL) : connectLocal()).catch(
      (err) => {
        g.__ffDb = undefined;
        throw err;
      },
    );
  }
  return g.__ffDb;
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  return (await db()).query<T>(text, params);
}

export async function one<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function tx<R>(fn: (q: Sql) => Promise<R>) {
  return (await db()).tx(fn);
}

async function connectPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  // prepare:false keeps us compatible with Supabase's transaction pooler (port 6543).
  const sql = postgres(url, { prepare: false, max: 3, idle_timeout: 20 });
  type Unsafe = { unsafe: (text: string, params?: never[]) => PromiseLike<unknown> };
  const wrap = (s: Unsafe): Sql => ({
    async query<T>(text: string, params: unknown[] = []) {
      return (await s.unsafe(text, params as never[])) as T[];
    },
  });
  return {
    mode: "supabase",
    ...wrap(sql),
    tx: (fn) => sql.begin((t) => fn(wrap(t))) as never,
  };
}

async function connectLocal(): Promise<Db> {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_DB) {
    console.warn(
      "[db] DATABASE_URL is not set — using the embedded local database. Data will not persist on serverless hosts.",
    );
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { mkdirSync } = await import("node:fs");
  const dir = process.env.LOCAL_DB_DIR ?? ".data/pglite";
  mkdirSync(dir, { recursive: true });
  const pg = await PGlite.create(dir);
  await runMigrations(
    {
      exec: async (s) => {
        await pg.exec(s);
      },
      query: async <T,>(s: string, p?: unknown[]) => (await pg.query<T>(s, p)).rows,
    },
    (m) => console.log(`[db] ${m}`),
  );
  const wrap = (s: Pick<typeof pg, "query">): Sql => ({
    async query<T>(text: string, params: unknown[] = []) {
      return (await s.query<T>(text, params)).rows;
    },
  });
  // PGlite is single-connection; serialize transactions so they don't interleave.
  let chain: Promise<unknown> = Promise.resolve();
  return {
    mode: "local",
    ...wrap(pg),
    tx: (fn) => {
      const run = chain.then(() => pg.transaction((t) => fn(wrap(t))));
      chain = run.catch(() => {});
      return run;
    },
  };
}
