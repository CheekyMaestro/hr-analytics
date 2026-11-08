/**
 * Readers: plain read-only SQL over a `Db`, no caching and no `server-only`.
 * The cached query functions in lib/queries/*.ts wrap them for the app; the
 * pipeline's golden check and the tests call them directly on a transaction or PGlite.
 */
import { sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db/drivers";
import { monthStart, type Filters } from "@/lib/domain/filters";
import type { LatestRun } from "../types";

/** Latest successful pipeline run, or null (no data yet / schema missing). */
export async function readLatestRun(db: Db): Promise<LatestRun | null> {
  try {
    const rows = await db.query<{ id: string; finished_at: string }>(sql`
      SELECT id::text AS id,
             to_char(finished_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS finished_at
      FROM dq_runs
      WHERE status = 'succeeded'
      ORDER BY finished_at DESC
      LIMIT 1`);
    const r = rows[0];
    return r ? { id: r.id, finished_at: r.finished_at, status: "succeeded" } : null;
  } catch (err) {
    if (isUndefinedTable(err)) return null;
    throw err;
  }
}

function isUndefinedTable(err: unknown): boolean {
  const code = (err as { code?: string; cause?: { code?: string } } | null)?.code ??
    (err as { cause?: { code?: string } } | null)?.cause?.code;
  return code === "42P01";
}

/** `WHERE` fragment for the standard filter on a table/view with `month` and `department_code`. */
export function filterWhere(f: Filters, opts: { ignoreDept?: boolean } = {}): SQL {
  const range = sql`month BETWEEN ${monthStart(f.from)}::date AND ${monthStart(f.to)}::date`;
  if (opts.ignoreDept || f.dept === null) return range;
  return sql`${range} AND department_code = ${f.dept}`;
}

/** Monthly sums from v_month_department for a filter. */
export type MonthSums = {
  month: string;
  department_code: string;
  headcount: number;
  leavers: number;
  absent_days: number;
  work_days: number;
  overtime_hours: number;
  ot_cost_idr: number;
};

export async function readMonthSums(
  db: Db,
  f: Filters,
  opts: { byDepartment?: boolean; ignoreDept?: boolean } = {},
): Promise<MonthSums[]> {
  const deptCol = opts.byDepartment ? sql`department_code` : sql`'*'::text`;
  const groupBy = opts.byDepartment ? sql`GROUP BY month, department_code` : sql`GROUP BY month`;
  return db.query<MonthSums>(sql`
    SELECT to_char(month, 'YYYY-MM') AS month,
           ${deptCol} AS department_code,
           sum(headcount)::int       AS headcount,
           sum(leavers)::int         AS leavers,
           sum(absent_days)::int     AS absent_days,
           sum(work_days)::int       AS work_days,
           sum(overtime_hours)::float8 AS overtime_hours,
           sum(ot_cost_idr)::float8  AS ot_cost_idr
    FROM v_month_department
    WHERE ${filterWhere(f, opts.ignoreDept ? { ignoreDept: true } : {})}
    ${groupBy}
    ORDER BY 1, 2`);
}
