import "server-only";
import { applyMigrations, MIGRATION_LOCK } from "./migrate";

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
  // Bring the schema up to date on first use, one instance at a time. A
  // transaction-scoped advisory lock works through Supabase's transaction
  // pooler (session locks don't). Set DB_AUTO_MIGRATE=0 to manage it by hand.
  if (process.env.DB_AUTO_MIGRATE !== "0") {
    await sql.begin(async (t) => {
      await t.unsafe(`select pg_advisory_xact_lock(${MIGRATION_LOCK})`);
      await applyMigrations(
        {
          exec: async (s) => {
            await t.unsafe(s);
          },
          query: async <T,>(s: string, p: unknown[] = []) => (await t.unsafe(s, p as never[])) as unknown as T[],
        },
        (m) => console.log(`[db] ${m}`),
      );
    });
  }
  return {
    mode: "supabase",
    ...wrap(sql),
    tx: (fn) => sql.begin((t) => fn(wrap(t))) as never,
  };
}

async function connectLocal(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { mkdirSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const hosted = process.env.NODE_ENV === "production";
  if (hosted) {
    console.warn(
      "[db] DATABASE_URL is not set — using a temporary embedded database. Nothing will persist; set DATABASE_URL (Supabase) for real use.",
    );
  }
  // Serverless file systems are read-only except the temp dir.
  const dir = process.env.LOCAL_DB_DIR ?? (hosted ? path.join(tmpdir(), "ff-pglite") : ".data/pglite");
  mkdirSync(dir, { recursive: true });
  const pg = await PGlite.create(dir);
  await pg.transaction(async (t) =>
    applyMigrations(
      {
        exec: async (s) => {
          await t.exec(s);
        },
        query: async <T,>(s: string, p?: unknown[]) => (await t.query<T>(s, p)).rows,
      },
      (m) => console.log(`[db] ${m}`),
    ),
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
