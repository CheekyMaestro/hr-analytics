/** `pnpm db:seed-ref` — upsert departments and department_aliases from data/*.csv. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { TxDb } from "@/db/drivers";
import { parseCsv } from "./lib/csv";

export async function seedReference(db: TxDb, dataDir = path.join(process.cwd(), "data")): Promise<{ departments: number; aliases: number }> {
  const departments = parseCsv(await readFile(path.join(dataDir, "departments.csv"), "utf8"));
  const aliases = parseCsv(await readFile(path.join(dataDir, "department_aliases.csv"), "utf8"));
  await db.transaction(async (tx) => {
    for (const d of departments) {
      await tx.query(sql`
        INSERT INTO departments (code, name, short_code, sort_order)
        VALUES (${d.code}, ${d.name}, ${d.short_code}, ${Number(d.sort_order)})
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, short_code = EXCLUDED.short_code, sort_order = EXCLUDED.sort_order`);
    }
    for (const a of aliases) {
      await tx.query(sql`
        INSERT INTO department_aliases (alias_normalized, department_code, example_raw)
        VALUES (${a.alias_normalized}, ${a.department_code}, ${a.example_raw})
        ON CONFLICT (alias_normalized) DO UPDATE SET department_code = EXCLUDED.department_code, example_raw = EXCLUDED.example_raw`);
    }
  });
  return { departments: departments.length, aliases: aliases.length };
}
