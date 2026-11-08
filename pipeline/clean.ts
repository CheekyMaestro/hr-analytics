/**
 * Cleaning pipeline (PRD.md §8.1, ARCHITECTURE.md §4). Reads raw_*, never
 * modifies them, and rebuilds the clean tables in ONE transaction. Any error
 * rolls back (the previous clean data stays) and records a failed dq_runs row.
 */
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Db, TxDb } from "@/db/drivers";
import { CHECKS, normalizeDepartment, runChecks, type DqIssueRow } from "./checks";
import { verifyAppendixA } from "./lib/appendix-a";
import { DEFAULT_SEED } from "./lib/generator-config";

export class PipelineError extends Error {}

export type CleanOptions = {
  seed: number | null;
  gitSha?: string | null;
  /** Verify PRD Appendix A before COMMIT when the seed is the default (default true). */
  verifyGolden?: boolean;
  /** Runs to keep in dq_runs (SCHEMA.md §8). */
  keepRuns?: number;
};

export type CleanResult = {
  runId: string;
  rawEmployeeRows: number;
  rawMonthlyRows: number;
  duplicateRows: number;
  cleanMonthlyRows: number;
  overtimeNullRows: number;
  departmentSpellings: number;
  issues: DqIssueRow[];
  goldenChecked: boolean;
};

const one = async (tx: Db, q: ReturnType<typeof sql>) => {
  const [row] = await tx.query<{ n: number }>(q);
  return row?.n ?? 0;
};

export async function runClean(db: TxDb, opts: CleanOptions): Promise<CleanResult> {
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  try {
    return await db.transaction(async (tx) => {
      const rawEmployeeRows = await one(tx, sql`SELECT count(*)::int AS n FROM raw_employees`);
      const rawMonthlyRows = await one(tx, sql`SELECT count(*)::int AS n FROM raw_monthly`);
      if (rawEmployeeRows === 0 || rawMonthlyRows === 0) {
        throw new PipelineError("Tabel raw kosong. Jalankan `pnpm pipeline` setelah `pnpm data:generate`.");
      }
      await tx.query(sql`
        INSERT INTO dq_runs (id, seed, git_sha, started_at, status, raw_employee_rows, raw_monthly_rows)
        VALUES (${runId}::uuid, ${opts.seed}, ${opts.gitSha ?? null}, ${startedAt}::timestamptz, 'running',
                ${rawEmployeeRows}, ${rawMonthlyRows})`);

      // Step 2 — standardise department; an unknown spelling stops the run.
      const unknown = await tx.query<{ department: string }>(sql`
        SELECT DISTINCT department FROM (
          SELECT department FROM raw_monthly UNION ALL SELECT department FROM raw_employees
        ) r
        WHERE NOT EXISTS (
          SELECT 1 FROM department_aliases a WHERE a.alias_normalized = ${normalizeDepartment(sql`r.department`)}
        )
        ORDER BY 1`);
      if (unknown.length) {
        const list = unknown.map((u) => JSON.stringify(u.department)).join(", ");
        throw new PipelineError(`Ejaan departemen tidak dikenal: ${list}. Tambahkan ke data/department_aliases.csv.`);
      }

      await tx.query(sql`
        CREATE TEMP TABLE stg_employees ON COMMIT DROP AS
        SELECT r.employee_id, r.full_name, a.department_code, r.job_level,
               r.hire_date::date AS hire_date, r.base_salary::bigint AS base_salary_idr, r.employment_type
        FROM raw_employees r
        JOIN department_aliases a ON a.alias_normalized = ${normalizeDepartment(sql`r.department`)}`);

      await tx.query(sql`
        CREATE TEMP TABLE stg_monthly ON COMMIT DROP AS
        SELECT r.source_row, r.employee_id, r.month, a.department_code, r.work_days, r.absent_days,
               r.overtime_hours, r.left_this_month
        FROM raw_monthly r
        JOIN department_aliases a ON a.alias_normalized = ${normalizeDepartment(sql`r.department`)}`);

      // Step 3 — exact duplicates: keep the first source row of each identical group.
      await tx.query(sql`
        CREATE TEMP TABLE stg_dedup ON COMMIT DROP AS
        SELECT DISTINCT ON (employee_id, month, department_code, work_days, absent_days, overtime_hours, left_this_month) *
        FROM stg_monthly
        ORDER BY employee_id, month, department_code, work_days, absent_days, overtime_hours, left_this_month, source_row`);
      const conflicts = await tx.query<{ employee_id: string; month: string }>(sql`
        SELECT employee_id, month FROM stg_dedup GROUP BY 1, 2 HAVING count(*) > 1 ORDER BY 1, 2 LIMIT 5`);
      if (conflicts.length) {
        const list = conflicts.map((c) => `${c.employee_id} ${c.month}`).join(", ");
        throw new PipelineError(`Baris dengan employee_id + month sama tetapi nilainya berbeda: ${list}.`);
      }

      // Step 4 — empty overtime → 0, flagged.
      await tx.query(sql`
        CREATE TEMP TABLE stg_typed ON COMMIT DROP AS
        SELECT employee_id, month::date AS month, department_code,
               work_days::smallint AS work_days, absent_days::smallint AS absent_days,
               coalesce(nullif(btrim(overtime_hours), '')::numeric(6,2), 0) AS overtime_hours,
               nullif(btrim(overtime_hours), '') IS NULL AS ot_imputed,
               left_this_month = '1' AS left_this_month
        FROM stg_dedup`);

      // Step 5 — fixes and validation checks (one dq_issues row each).
      const issues = await runChecks(tx);
      if (issues.length !== CHECKS.length) throw new PipelineError("Jumlah pemeriksaan DQ tidak lengkap.");

      // Rows that fail DQ-05/07/08 are kept out of the clean table (the run continues, status Gagal).
      await tx.query(sql`
        CREATE TEMP TABLE stg_valid ON COMMIT DROP AS
        SELECT t.*, f.exit_month
        FROM stg_typed t
        LEFT JOIN (SELECT employee_id, min(month) AS exit_month FROM stg_typed WHERE left_this_month GROUP BY 1) f
          USING (employee_id)
        WHERE t.absent_days <= t.work_days
          AND (f.exit_month IS NULL OR t.month <= f.exit_month)
          AND EXISTS (SELECT 1 FROM stg_employees e WHERE e.employee_id = t.employee_id)`);

      // Step 6 — rebuild clean tables with the row features (ARCHITECTURE.md §4.3).
      await tx.query(sql`TRUNCATE employee_months, employees`);
      await tx.query(sql`
        INSERT INTO employees (employee_id, full_name, department_code, job_level, hire_date, base_salary_idr, employment_type)
        SELECT employee_id, full_name, department_code, job_level, hire_date, base_salary_idr, employment_type
        FROM stg_employees`);
      await tx.query(sql`
        INSERT INTO employee_months (
          employee_id, month, department_code, work_days, absent_days, overtime_hours, ot_imputed, left_this_month,
          ot_cost_idr, ot_hours_3m_avg, ot_bucket, months_to_exit, is_stayer, run_id)
        SELECT v.employee_id, v.month, v.department_code, v.work_days, v.absent_days, v.overtime_hours,
               v.ot_imputed, v.left_this_month,
               round(v.overtime_hours * e.base_salary_idr * 1.5 / 173)::bigint,
               v.avg3,
               CASE WHEN v.avg3 <= 20 THEN 'le20' WHEN v.avg3 <= 40 THEN '20to40' ELSE 'gt40' END,
               CASE WHEN v.exit_month IS NULL THEN NULL
                    ELSE ((extract(year FROM v.exit_month) - extract(year FROM v.month)) * 12
                          + extract(month FROM v.exit_month) - extract(month FROM v.month))::smallint END,
               v.exit_month IS NULL AND v.n_rows = (SELECT count(DISTINCT month) FROM stg_valid),
               ${runId}::uuid
        FROM (
          SELECT s.*,
                 round(avg(s.overtime_hours) OVER w, 2) AS avg3,
                 count(*) OVER (PARTITION BY s.employee_id) AS n_rows
          FROM stg_valid s
          WINDOW w AS (PARTITION BY s.employee_id ORDER BY s.month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
        ) v
        JOIN stg_employees e USING (employee_id)`);

      for (const i of issues) {
        await tx.query(sql`
          INSERT INTO dq_issues (run_id, code, table_name, column_name, kind, description, rows_affected, action, status)
          VALUES (${runId}::uuid, ${i.code}, ${i.table_name}, ${i.column_name}, ${i.kind}, ${i.description},
                  ${i.rows_affected}, ${i.action}, ${i.status})`);
      }
      await tx.query(sql`
        INSERT INTO dq_alias_hits (run_id, table_name, raw_value, department_code, is_canonical, rows)
        SELECT ${runId}::uuid, t.table_name, t.department, a.department_code, t.department = d.name, count(*)::int
        FROM (
          SELECT 'monthly' AS table_name, department FROM raw_monthly
          UNION ALL SELECT 'employees', department FROM raw_employees
        ) t
        JOIN department_aliases a ON a.alias_normalized = ${normalizeDepartment(sql`t.department`)}
        JOIN departments d ON d.code = a.department_code
        GROUP BY t.table_name, t.department, a.department_code, d.name`);

      const duplicateRows = issues.find((i) => i.code === "DQ-03")?.rows_affected ?? 0;
      const overtimeNullRows = issues.find((i) => i.code === "DQ-04")?.rows_affected ?? 0;
      const cleanMonthlyRows = await one(tx, sql`SELECT count(*)::int AS n FROM employee_months`);
      const departmentSpellings = await one(tx, sql`
        SELECT count(DISTINCT department)::int AS n FROM (
          SELECT department FROM raw_monthly UNION ALL SELECT department FROM raw_employees) r`);

      await tx.query(sql`
        UPDATE dq_runs SET status = 'succeeded', finished_at = now(),
               duplicate_rows = ${duplicateRows}, clean_monthly_rows = ${cleanMonthlyRows},
               overtime_null_rows = ${overtimeNullRows}, department_spellings = ${departmentSpellings}
        WHERE id = ${runId}::uuid`);

      // Golden figures: fail (and roll back) if the default seed no longer reproduces Appendix A.
      const goldenChecked = (opts.verifyGolden ?? true) && opts.seed === DEFAULT_SEED;
      if (goldenChecked) {
        const drift = await verifyAppendixA(tx);
        if (drift.length) {
          throw new PipelineError(`Angka acuan PRD Appendix A bergeser:\n  ${drift.join("\n  ")}`);
        }
      }

      // Retention: keep the last N runs (the current run is always among them).
      await tx.query(sql`
        DELETE FROM dq_runs WHERE id NOT IN (
          SELECT id FROM dq_runs ORDER BY started_at DESC LIMIT ${opts.keepRuns ?? 50})`);

      return {
        runId,
        rawEmployeeRows,
        rawMonthlyRows,
        duplicateRows,
        cleanMonthlyRows,
        overtimeNullRows,
        departmentSpellings,
        issues,
        goldenChecked,
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // The transaction rolled back; record the failure in a separate statement.
    await db
      .query(sql`
        INSERT INTO dq_runs (id, seed, git_sha, started_at, finished_at, status, error_message)
        VALUES (${runId}::uuid, ${opts.seed}, ${opts.gitSha ?? null}, ${startedAt}::timestamptz, now(), 'failed',
                ${message.slice(0, 2000)})
        ON CONFLICT (id) DO UPDATE SET status = 'failed', finished_at = now(), error_message = EXCLUDED.error_message`)
      .catch(() => undefined);
    throw err;
  }
}
