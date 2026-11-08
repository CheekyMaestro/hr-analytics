/** Load the raw CSVs into raw_employees / raw_monthly unchanged, all columns as text (FR-02). */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sql, type SQL } from "drizzle-orm";
import type { TxDb } from "@/db/drivers";
import { parseCsv } from "./lib/csv";
import { EMPLOYEES_FILE, MANIFEST_FILE, MONTHLY_FILE, RAW_DIR, sha256, type Manifest } from "./generate";
import { EMPLOYEE_COLUMNS, MONTHLY_COLUMNS } from "./lib/generator";

const BATCH = 500;

export type RawFiles = { employees: string; monthly: string; seed: number | null };

/** Read the CSVs; the seed is known only when the files match the generator's manifest. */
export async function readRawFiles(dir = RAW_DIR): Promise<RawFiles> {
  const employees = await readFile(path.join(dir, EMPLOYEES_FILE), "utf8");
  const monthly = await readFile(path.join(dir, MONTHLY_FILE), "utf8");
  let seed: number | null = null;
  try {
    const manifest = JSON.parse(await readFile(path.join(dir, MANIFEST_FILE), "utf8")) as Manifest;
    const ok =
      manifest.files[EMPLOYEES_FILE]?.sha256 === sha256(employees) &&
      manifest.files[MONTHLY_FILE]?.sha256 === sha256(monthly);
    seed = ok ? manifest.seed : null;
  } catch {
    seed = null;
  }
  return { employees, monthly, seed };
}

async function insertBatches(
  tx: { query: (q: SQL) => Promise<unknown> },
  table: "raw_employees" | "raw_monthly",
  columns: readonly string[],
  rows: Record<string, string>[],
): Promise<void> {
  const cols = sql.raw(["source_row", ...columns].join(", "));
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const values = sql.join(
      chunk.map((r, k) => sql`(${i + k + 1}, ${sql.join(columns.map((c) => sql`${r[c] ?? null}`), sql`, `)})`),
      sql`, `,
    );
    await tx.query(sql`INSERT INTO ${sql.raw(table)} (${cols}) VALUES ${values}`);
  }
}

export async function loadRaw(db: TxDb, files: RawFiles): Promise<{ employees: number; monthly: number }> {
  const employees = parseCsv(files.employees);
  const monthly = parseCsv(files.monthly);
  await db.transaction(async (tx) => {
    await tx.query(sql`TRUNCATE raw_employees, raw_monthly`);
    await insertBatches(tx, "raw_employees", EMPLOYEE_COLUMNS, employees);
    await insertBatches(tx, "raw_monthly", MONTHLY_COLUMNS, monthly);
  });
  return { employees: employees.length, monthly: monthly.length };
}
