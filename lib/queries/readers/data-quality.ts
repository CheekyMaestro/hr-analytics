import { sql } from "drizzle-orm";
import type { Db } from "@/db/drivers";
import type { DepartmentCode, Filters } from "@/lib/domain/filters";
import { sharePct } from "@/lib/domain/kpi";
import type { DqAlias, DqIssue, DqSummary, Meta, MonthlyExportRow, OvertimeNull } from "../types";
import { filterWhere, readLatestRun } from "./shared";
import { readOvertimeLeave } from "./dashboard";

export async function readMeta(db: Db): Promise<Meta | null> {
  const run = await readLatestRun(db);
  if (!run) return null;
  const [months, departments, counts, failed] = await Promise.all([
    db.query<{ month: string }>(sql`SELECT DISTINCT to_char(month, 'YYYY-MM') AS month FROM employee_months ORDER BY 1`),
    db.query<{ code: DepartmentCode; name: string; short_code: string }>(
      sql`SELECT code, name, short_code FROM departments ORDER BY sort_order`,
    ),
    db.query<{ employee_rows: number; monthly_raw_rows: number; monthly_clean_rows: number }>(sql`
      SELECT raw_employee_rows AS employee_rows, raw_monthly_rows AS monthly_raw_rows,
             clean_monthly_rows AS monthly_clean_rows
      FROM dq_runs WHERE id = ${run.id}::uuid`),
    db.query<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM dq_issues WHERE run_id = ${run.id}::uuid AND status = 'gagal'`),
  ]);
  if (months.length === 0) return null;
  return {
    months: months.map((m) => m.month),
    departments,
    latest_run: run,
    sources: counts[0] ?? { employee_rows: 0, monthly_raw_rows: 0, monthly_clean_rows: 0 },
    failed_checks: failed[0]?.n ?? 0,
  };
}

export async function readDqSummary(db: Db): Promise<DqSummary | null> {
  const run = await readLatestRun(db);
  if (!run) return null;
  const rows = await db.query<Omit<DqSummary, "overtime_null_pct" | "finished_at" | "run_id">>(sql`
    SELECT raw_monthly_rows AS raw_rows, duplicate_rows, clean_monthly_rows AS clean_rows,
           department_spellings, (SELECT count(*)::int FROM departments) AS department_canonical,
           overtime_null_rows
    FROM dq_runs WHERE id = ${run.id}::uuid`);
  const r = rows[0];
  if (!r) return null;
  return {
    run_id: run.id,
    finished_at: run.finished_at,
    ...r,
    overtime_null_pct: sharePct(r.overtime_null_rows, r.clean_rows),
  };
}

export async function readDqIssues(db: Db): Promise<DqIssue[] | null> {
  const run = await readLatestRun(db);
  if (!run) return null;
  return db.query<DqIssue>(sql`
    SELECT code, table_name, column_name, description, rows_affected, action, status
    FROM dq_issues WHERE run_id = ${run.id}::uuid ORDER BY code`);
}

/** Non-canonical spellings and the rows they affected, per table. */
export async function readDqAliases(db: Db): Promise<DqAlias[] | null> {
  const run = await readLatestRun(db);
  if (!run) return null;
  return db.query<DqAlias>(sql`
    SELECT h.raw_value, h.department_code, d.name AS department_name, h.table_name, h.rows
    FROM dq_alias_hits h JOIN departments d ON d.code = h.department_code
    WHERE h.run_id = ${run.id}::uuid AND NOT h.is_canonical
    ORDER BY h.table_name DESC, d.sort_order, h.rows DESC, h.raw_value`);
}

export async function readOvertimeNull(db: Db, f: Filters): Promise<OvertimeNull | null> {
  const [summary, byDept, sens] = await Promise.all([
    readDqSummary(db),
    db.query<{ code: DepartmentCode; name: string; rows: number }>(sql`
      SELECT d.code, d.name, count(m.*) FILTER (WHERE m.ot_imputed)::int AS rows
      FROM departments d LEFT JOIN employee_months m ON m.department_code = d.code
      GROUP BY d.code, d.name, d.sort_order ORDER BY d.sort_order`),
    readOvertimeLeave(db, f),
  ]);
  if (!summary || !sens) return null;
  return {
    total: summary.overtime_null_rows,
    pct: summary.overtime_null_pct,
    by_department: byDept,
    sensitivity: { ratio_all: sens.ratio_high_low, ratio_excl_imputed: sens.ratio_high_low_excl_imputed },
  };
}

/** Column order of the clean monthly CSV (SCHEMA.md §3.3). */
export const MONTHLY_EXPORT_COLUMNS = [
  "employee_id",
  "month",
  "department_code",
  "work_days",
  "absent_days",
  "overtime_hours",
  "ot_imputed",
  "left_this_month",
  "ot_cost_idr",
  "ot_hours_3m_avg",
  "ot_bucket",
  "months_to_exit",
  "is_stayer",
  "run_id",
] as const;

export async function readMonthlyRows(db: Db, f: Filters): Promise<MonthlyExportRow[] | null> {
  if (!(await readLatestRun(db))) return null;
  return db.query<MonthlyExportRow>(sql`
    SELECT employee_id, to_char(month, 'YYYY-MM-DD') AS month, department_code,
           work_days::text AS work_days, absent_days::text AS absent_days, overtime_hours::text AS overtime_hours,
           ot_imputed::text AS ot_imputed, left_this_month::text AS left_this_month,
           ot_cost_idr::text AS ot_cost_idr, ot_hours_3m_avg::text AS ot_hours_3m_avg, ot_bucket,
           coalesce(months_to_exit::text, '') AS months_to_exit, is_stayer::text AS is_stayer, run_id::text AS run_id
    FROM employee_months WHERE ${filterWhere(f)}
    ORDER BY employee_id, month`);
}
