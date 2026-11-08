/** `pnpm db:migrate` — apply SQL migrations in db/migrations (drizzle journal). */
import path from "node:path";
import { driverKind } from "@/db/drivers";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "db", "migrations");

export async function migrateUrl(url: string): Promise<void> {
  const kind = driverKind(url);
  if (kind === "neon") {
    const { Pool, neonConfig } = await import("@neondatabase/serverless");
    if (!neonConfig.webSocketConstructor && typeof WebSocket !== "undefined") neonConfig.webSocketConstructor = WebSocket;
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const { migrate } = await import("drizzle-orm/neon-serverless/migrator");
    const pool = new Pool({ connectionString: url });
    try {
      await migrate(drizzle({ client: pool }), { migrationsFolder: MIGRATIONS_FOLDER });
    } finally {
      await pool.end();
    }
    return;
  }
  if (kind === "pglite") {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = url.slice("pglite:".length).replace(/^\/\//, "");
    const client = await PGlite.create(dir && dir !== "memory" ? { dataDir: dir } : {});
    try {
      await migratePglite(client);
    } finally {
      await client.close();
    }
    return;
  }
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
}

export async function migratePglite(client: import("@electric-sql/pglite").PGlite): Promise<void> {
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  await migrate(drizzle({ client }), { migrationsFolder: MIGRATIONS_FOLDER });
}
