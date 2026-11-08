/**
 * Golden-figure test (RULES.md §8): migrations + pipeline on in-process Postgres
 * (PGlite), then every figure of PRD.md Appendix A through the same readers the
 * app uses. Also covers the mandatory pipeline guarantees.
 */
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fromPglite, type TxDb } from "@/db/drivers";
import { buildCsvs } from "@/pipeline/generate";
import { loadRaw } from "@/pipeline/load";
import { runClean } from "@/pipeline/clean";
import { migratePglite } from "@/pipeline/migrate";
import { seedReference } from "@/pipeline/seed-ref";
import { APPENDIX_A, verifyAppendixA } from "@/pipeline/lib/appendix-a";
import { DEFAULT_SEED } from "@/pipeline/lib/generator-config";
import { readDepartments, readDqAliases, readFindings, readLatestRun, readMeta, readSummary } from "@/lib/queries/readers";

let client: PGlite;
let db: TxDb;
const csvs = buildCsvs(DEFAULT_SEED);

const rawChecksum = async () =>
  (
    await db.query<{ n: number; h: string }>(sql`
      SELECT (SELECT count(*) FROM raw_monthly)::int + (SELECT count(*) FROM raw_employees)::int AS n,
             md5((SELECT string_agg(concat_ws('|', source_row, employee_id, month, department, work_days, absent_days,
                                              overtime_hours, left_this_month), E'\\n' ORDER BY source_row) FROM raw_monthly)
                 || (SELECT string_agg(concat_ws('|', source_row, employee_id, full_name, department, job_level, hire_date,
                                                 base_salary, employment_type), E'\\n' ORDER BY source_row) FROM raw_employees)) AS h`)
  )[0]!;

beforeAll(async () => {
  client = await PGlite.create();
  await migratePglite(client);
  db = await fromPglite(client);
  await seedReference(db);
  await loadRaw(db, { employees: csvs.employees, monthly: csvs.monthly, seed: DEFAULT_SEED });
});

afterAll(async () => {
  await client.close();
});

describe("pipeline on the default seed", () => {
  it("is empty before the first run", async () => {
    expect(await readLatestRun(db)).toBeNull();
    expect(await readSummary(db, { from: "2025-01", to: "2025-12", dept: null })).toBeNull();
  });

  it("runs, leaves raw tables unchanged, and reproduces PRD Appendix A", async () => {
    const before = await rawChecksum();
    const result = await runClean(db, { seed: DEFAULT_SEED, verifyGolden: false });
    expect(await rawChecksum()).toEqual(before);

    expect(result.rawMonthlyRows).toBe(APPENDIX_A.rawMonthlyRows);
    expect(result.cleanMonthlyRows).toBe(APPENDIX_A.cleanMonthlyRows);
    expect(result.issues.map((i) => [i.code, i.rows_affected, i.status])).toEqual([
      ["DQ-01", 1126, "diperbaiki"],
      ["DQ-02", 97, "diperbaiki"],
      ["DQ-03", 20, "diperbaiki"],
      ["DQ-04", 312, "perlu_konfirmasi"],
      ["DQ-05", 0, "lolos"],
      ["DQ-06", 0, "lolos"],
      ["DQ-07", 0, "lolos"],
      ["DQ-08", 0, "lolos"],
    ]);
    expect(await verifyAppendixA(db)).toEqual([]);
  });

  it("records every raw spelling (16 → 6) with the documented monthly counts", async () => {
    const aliases = (await readDqAliases(db))!.filter((a) => a.table_name === "monthly");
    const counts = Object.fromEntries(aliases.map((a) => [a.raw_value, a.rows]));
    expect(counts).toEqual({
      "HAULING ": 188,
      Haul: 140,
      "Mining Ops": 212,
      "MINING OPS": 96,
      "mining operation": 64,
      "Plant&Maint": 150,
      Maintenance: 98,
      "K3/HSE": 52,
      HRGA: 70,
      "Fin & Acc": 56,
    });
  });

  it("fills the findings from data (no placeholders, never 'menyebabkan')", async () => {
    const findings = (await readFindings(db, { from: "2025-01", to: "2025-12", dept: null }))!;
    expect(findings).toHaveLength(3);
    for (const f of findings) {
      for (const text of [f.title, f.body, f.recommendation]) {
        expect(text).not.toMatch(/[{}]/);
        expect(text.toLowerCase()).not.toContain("menyebabkan");
      }
    }
    expect(findings[0]!.title).toContain("Hauling");
    expect(findings[1]!.title).toContain("2,9×");
  });

  it("filters by department and period", async () => {
    const hauling = (await readSummary(db, { from: "2025-01", to: "2025-12", dept: "hauling" }))!;
    expect(hauling.headcount_start).toBe(120);
    expect(hauling.leavers).toBe(26);
    const h1 = (await readSummary(db, { from: "2025-01", to: "2025-06", dept: null }))!;
    expect(h1.leavers).toBe(3 + 4 + 4 + 5 + 5 + 6);
    // The department ranking ignores the department filter.
    const depts = (await readDepartments(db, { from: "2025-01", to: "2025-12", dept: "hse" }))!;
    expect(depts).toHaveLength(6);
  });

  it("readers need SELECT only (runtime is read-only)", async () => {
    await client.exec(`
      CREATE ROLE hr_reader;
      GRANT USAGE ON SCHEMA public TO hr_reader;
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO hr_reader;`);
    await client.exec("SET ROLE hr_reader");
    try {
      expect(await readMeta(db)).not.toBeNull();
      expect(await verifyAppendixA(db)).toEqual([]);
      await expect(client.exec("DELETE FROM dq_runs")).rejects.toThrow();
    } finally {
      await client.exec("RESET ROLE");
    }
  });
});

describe("pipeline failures", () => {
  it("an unknown department spelling aborts the run and keeps the previous clean data", async () => {
    const previous = (await readLatestRun(db))!;
    const rowsBefore = (await db.query<{ n: number }>(sql`SELECT count(*)::int AS n FROM employee_months`))[0]!.n;

    await db.query(sql`UPDATE raw_monthly SET department = 'Pit Services' WHERE source_row = 1`);
    await expect(runClean(db, { seed: null })).rejects.toThrow(/Pit Services/);

    expect((await readLatestRun(db))!.id).toBe(previous.id);
    expect((await db.query<{ n: number }>(sql`SELECT count(*)::int AS n FROM employee_months`))[0]!.n).toBe(rowsBefore);
    const failed = await db.query<{ status: string; error_message: string }>(
      sql`SELECT status, error_message FROM dq_runs WHERE status = 'failed'`,
    );
    expect(failed).toHaveLength(1);
    expect(failed[0]!.error_message).toContain("Pit Services");
  });

  it("same key with different values aborts the run", async () => {
    await loadRaw(db, { employees: csvs.employees, monthly: csvs.monthly, seed: DEFAULT_SEED });
    await db.query(sql`
      INSERT INTO raw_monthly
      SELECT 99999, employee_id, month, department, work_days, absent_days, '77', left_this_month
      FROM raw_monthly WHERE source_row = 2`);
    await expect(runClean(db, { seed: null })).rejects.toThrow(/nilainya berbeda/);
  });

  it("a validation failure is logged as Gagal while the run still succeeds", async () => {
    await loadRaw(db, { employees: csvs.employees, monthly: csvs.monthly, seed: DEFAULT_SEED });
    await db.query(sql`UPDATE raw_monthly SET absent_days = '40' WHERE source_row = 3`);
    const r = await runClean(db, { seed: null });
    const dq05 = r.issues.find((i) => i.code === "DQ-05")!;
    expect(dq05).toMatchObject({ rows_affected: 1, status: "gagal" });
    expect(r.cleanMonthlyRows).toBe(APPENDIX_A.cleanMonthlyRows - 1);
    expect((await readMeta(db))!.failed_checks).toBe(1);
  });
});
