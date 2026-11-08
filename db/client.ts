import "server-only";
import { createReadDb, type Db } from "./drivers";
import { getEnv } from "@/lib/env";

let dbPromise: Promise<Db> | null = null;
let override: Db | null = null;

/**
 * Runtime database client (read-only usage, pooled `DATABASE_URL`).
 * Returns null when no database is configured, so the UI shows the empty state
 * and the Vercel build succeeds without a database (ARCHITECTURE.md §4.4).
 */
export function getDb(): Promise<Db> | null {
  if (override) return Promise.resolve(override);
  const url = getEnv().DATABASE_URL;
  if (!url) return null;
  dbPromise ??= createReadDb(url);
  return dbPromise;
}

/** Test hook: route handler tests inject an in-process PGlite database. */
export function setDbForTesting(db: Db | null): void {
  override = db;
}
