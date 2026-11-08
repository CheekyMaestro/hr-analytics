/**
 * Database drivers. One tiny interface (`Db.query`) over drizzle's drivers so
 * readers (lib/queries/readers) and the pipeline run unchanged on:
 *
 * - Neon (production): `neon()` HTTP driver at runtime, WebSocket `Pool` in the pipeline
 * - any other Postgres URL: node-postgres `Pool` (CI service containers, local Postgres)
 * - `pglite:<dir>` / `pglite:memory`: in-process PGlite (tests and local dev without a server)
 *
 * All SQL casts its outputs (::int, ::float8, ::text) so every driver returns plain JS values.
 */
import type { SQL } from "drizzle-orm";

export type Row = Record<string, unknown>;

export interface Db {
  query<T extends Row = Row>(q: SQL): Promise<T[]>;
}

export interface TxDb extends Db {
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

type Executor = { execute: (q: SQL) => Promise<unknown> };

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: Row[] }).rows;
  }
  return [];
}

function wrap(ex: Executor): Db {
  return {
    async query<T extends Row>(q: SQL) {
      return rowsOf(await ex.execute(q)) as T[];
    },
  };
}

type TransactionalDrizzle = Executor & {
  transaction: <T>(fn: (tx: Executor) => Promise<T>) => Promise<T>;
};

function wrapTx(d: TransactionalDrizzle, close: () => Promise<void>): TxDb {
  return {
    ...wrap(d),
    transaction: (fn) => d.transaction((tx) => fn(wrap(tx))),
    close,
  };
}

export type DriverKind = "neon" | "pg" | "pglite";

export function driverKind(url: string): DriverKind {
  if (url.startsWith("pglite:")) return "pglite";
  try {
    const host = new URL(url).hostname;
    if (host.endsWith(".neon.tech") || host.endsWith(".neon.build")) return "neon";
  } catch {
    throw new Error("DATABASE_URL bukan URL Postgres yang valid.");
  }
  return "pg";
}

function pgliteDir(url: string): string | undefined {
  const rest = url.slice("pglite:".length).replace(/^\/\//, "");
  return rest === "" || rest === "memory" ? undefined : rest;
}

const pgliteInstances = new Map<string, Promise<unknown>>();

/** One PGlite instance per data directory and process (PGlite is single-connection). */
async function getPglite(url: string) {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = pgliteDir(url);
  const key = dir ?? `memory:${Math.random()}`;
  let inst = pgliteInstances.get(key) as Promise<InstanceType<typeof PGlite>> | undefined;
  if (!inst) {
    inst = PGlite.create(dir ? { dataDir: dir } : {});
    pgliteInstances.set(key, inst);
  }
  return inst;
}

/** Read-only runtime client (pooled URL, HTTP for Neon). */
export async function createReadDb(url: string): Promise<Db> {
  const kind = driverKind(url);
  if (kind === "neon") {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return wrap(drizzle({ client: neon(url) }) as unknown as Executor);
  }
  if (kind === "pglite") {
    const { drizzle } = await import("drizzle-orm/pglite");
    return wrap(drizzle({ client: await getPglite(url) }) as unknown as Executor);
  }
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  return wrap(drizzle({ client: new Pool({ connectionString: url, max: 3 }) }) as unknown as Executor);
}

/** Transactional client for the pipeline and migrations (unpooled URL). */
export async function createTxDb(url: string): Promise<TxDb> {
  const kind = driverKind(url);
  if (kind === "neon") {
    const { Pool, neonConfig } = await import("@neondatabase/serverless");
    if (!neonConfig.webSocketConstructor && typeof WebSocket !== "undefined") {
      neonConfig.webSocketConstructor = WebSocket;
    }
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const pool = new Pool({ connectionString: url });
    return wrapTx(drizzle({ client: pool }) as unknown as TransactionalDrizzle, () => pool.end());
  }
  if (kind === "pglite") {
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = await getPglite(url);
    return wrapTx(drizzle({ client }) as unknown as TransactionalDrizzle, async () => {
      pgliteInstances.clear();
      await client.close();
    });
  }
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString: url, max: 1 });
  return wrapTx(drizzle({ client: pool }) as unknown as TransactionalDrizzle, () => pool.end());
}

/** Wrap an existing PGlite instance (tests). */
export async function fromPglite(client: import("@electric-sql/pglite").PGlite): Promise<TxDb> {
  const { drizzle } = await import("drizzle-orm/pglite");
  return wrapTx(drizzle({ client }) as unknown as TransactionalDrizzle, async () => {});
}
