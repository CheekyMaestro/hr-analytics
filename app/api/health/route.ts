import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { readLatestRun } from "@/lib/queries/readers";

/** Database reachability and the latest run ID (FR-32). Never cached. */
export async function GET() {
  await connection();
  const headers = { "Cache-Control": "no-store" };
  try {
    const db = await getDb();
    if (!db) return Response.json({ ok: false, db: "down", latest_run_id: null }, { status: 503, headers });
    await db.query(sql`SELECT 1 AS ok`);
    const run = await readLatestRun(db);
    return Response.json({ ok: true, db: "up", latest_run_id: run?.id ?? null }, { headers });
  } catch {
    return Response.json({ ok: false, db: "down", latest_run_id: null }, { status: 503, headers });
  }
}
