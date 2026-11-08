import { sql } from "drizzle-orm";
import type { Db } from "@/db/drivers";
import type { DepartmentCode, Filters } from "@/lib/domain/filters";
import {
  absenteeismPct,
  leaveRatePct,
  OVERTIME_BUCKET_LABEL,
  OVERTIME_BUCKETS,
  ratio,
  sharePct,
  turnoverAnnualPct,
  turnoverMonthlyAvgPct,
  turnoverPct,
  type OvertimeBucket,
} from "@/lib/domain/kpi";
import { riskLevel } from "@/lib/domain/risk";
import { buildFindings } from "@/lib/domain/findings";
import type { AbsenceLeave, DepartmentRow, Finding, MonthlyPoint, OvertimeLeave, Summary } from "../types";
import { filterWhere, readLatestRun, readMonthSums, type MonthSums } from "./shared";

function summarise(months: MonthSums[]): Summary {
  const first = months[0];
  const last = months[months.length - 1];
  const sum = (k: keyof MonthSums) => months.reduce((a, m) => a + (m[k] as number), 0);
  const headcountRows = sum("headcount");
  return {
    headcount_start: first?.headcount ?? 0,
    headcount_end: last ? last.headcount - last.leavers : 0,
    leavers: sum("leavers"),
    turnover_monthly_avg_pct: turnoverMonthlyAvgPct(months),
    turnover_annual_pct: turnoverAnnualPct(months),
    absenteeism_pct: absenteeismPct(sum("absent_days"), sum("work_days")),
    overtime_cost_idr: sum("ot_cost_idr"),
    overtime_hours_per_employee_month: headcountRows > 0 ? sum("overtime_hours") / headcountRows : 0,
  };
}

export async function readSummary(db: Db, f: Filters): Promise<Summary | null> {
  if (!(await readLatestRun(db))) return null;
  return summarise(await readMonthSums(db, f));
}

export async function readMonthly(db: Db, f: Filters): Promise<MonthlyPoint[] | null> {
  if (!(await readLatestRun(db))) return null;
  const months = await readMonthSums(db, f);
  return months.map((m) => ({
    month: m.month,
    headcount: m.headcount,
    leavers: m.leavers,
    turnover_pct: turnoverPct(m.leavers, m.headcount),
    absenteeism_pct: absenteeismPct(m.absent_days, m.work_days),
    overtime_hours: m.overtime_hours,
    overtime_cost_idr: m.ot_cost_idr,
  }));
}

/** All departments for the period (ignores `dept`), sorted by turnover desc. */
export async function readDepartments(db: Db, f: Filters): Promise<DepartmentRow[] | null> {
  if (!(await readLatestRun(db))) return null;
  const [byDept, site, depts] = await Promise.all([
    readMonthSums(db, f, { byDepartment: true, ignoreDept: true }),
    readMonthSums(db, f, { ignoreDept: true }),
    db.query<{ code: DepartmentCode; name: string; short_code: string }>(
      sql`SELECT code, name, short_code FROM departments ORDER BY sort_order`,
    ),
  ]);
  const siteSummary = summarise(site);
  const siteRisk = { turnoverPct: siteSummary.turnover_monthly_avg_pct, absenteeismPct: siteSummary.absenteeism_pct };
  const rows = depts.map((d): DepartmentRow => {
    const s = summarise(byDept.filter((m) => m.department_code === d.code));
    return {
      code: d.code,
      name: d.name,
      short_code: d.short_code,
      headcount_start: s.headcount_start,
      leavers: s.leavers,
      turnover_pct: s.turnover_monthly_avg_pct,
      absenteeism_pct: s.absenteeism_pct,
      overtime_hours_per_employee_month: s.overtime_hours_per_employee_month,
      overtime_cost_idr: s.overtime_cost_idr,
      cost_share_pct: sharePct(s.overtime_cost_idr, siteSummary.overtime_cost_idr),
      risk_level: riskLevel({ turnoverPct: s.turnover_monthly_avg_pct, absenteeismPct: s.absenteeism_pct }, siteRisk),
    };
  });
  return rows.sort((a, b) => b.turnover_pct - a.turnover_pct);
}

type BucketSums = { ot_bucket: OvertimeBucket; rows: number; leavers: number; rows_x: number; leavers_x: number };

export async function readOvertimeLeave(db: Db, f: Filters): Promise<OvertimeLeave | null> {
  if (!(await readLatestRun(db))) return null;
  const where = filterWhere(f);
  const [sums, corr] = await Promise.all([
    db.query<BucketSums>(sql`
      SELECT ot_bucket,
             count(*)::int                                                  AS rows,
             count(*) FILTER (WHERE left_this_month)::int                   AS leavers,
             count(*) FILTER (WHERE NOT ot_imputed)::int                    AS rows_x,
             count(*) FILTER (WHERE left_this_month AND NOT ot_imputed)::int AS leavers_x
      FROM employee_months
      WHERE ${where}
      GROUP BY ot_bucket`),
    db.query<{ r: number | null }>(sql`
      SELECT corr(left_this_month::int::float8, ot_hours_3m_avg::float8)::float8 AS r
      FROM employee_months WHERE ${where}`),
  ]);
  const get = (b: OvertimeBucket) => sums.find((s) => s.ot_bucket === b) ?? { rows: 0, leavers: 0, rows_x: 0, leavers_x: 0 };
  const buckets = OVERTIME_BUCKETS.map((b) => {
    const s = get(b);
    return { bucket: b, label: OVERTIME_BUCKET_LABEL[b], rows: s.rows, leavers: s.leavers, leave_rate_pct: leaveRatePct(s.leavers, s.rows) };
  });
  const lo = get("le20");
  const hi = get("gt40");
  const rateX = (s: { leavers_x: number; rows_x: number }) => leaveRatePct(s.leavers_x, s.rows_x);
  return {
    buckets,
    ratio_high_low: ratio(leaveRatePct(hi.leavers, hi.rows), leaveRatePct(lo.leavers, lo.rows)),
    ratio_high_low_excl_imputed: ratio(rateX(hi), rateX(lo)),
    r_overtime: corr[0]?.r ?? null,
  };
}

export async function readAbsenceLeave(db: Db, f: Filters): Promise<AbsenceLeave | null> {
  if (!(await readLatestRun(db))) return null;
  const where = filterWhere(f);
  const [groups, corr] = await Promise.all([
    db.query<{ l_emp: number; l_ab: number; l_wd: number; s_emp: number; s_ab: number; s_wd: number }>(sql`
      SELECT count(DISTINCT employee_id) FILTER (WHERE months_to_exit BETWEEN 0 AND 2)::int AS l_emp,
             coalesce(sum(absent_days) FILTER (WHERE months_to_exit BETWEEN 0 AND 2), 0)::int AS l_ab,
             coalesce(sum(work_days)   FILTER (WHERE months_to_exit BETWEEN 0 AND 2), 0)::int AS l_wd,
             count(DISTINCT employee_id) FILTER (WHERE is_stayer)::int AS s_emp,
             coalesce(sum(absent_days) FILTER (WHERE is_stayer), 0)::int AS s_ab,
             coalesce(sum(work_days)   FILTER (WHERE is_stayer), 0)::int AS s_wd
      FROM employee_months WHERE ${where}`),
    db.query<{ r: number | null }>(sql`
      SELECT corr(left_this_month::int::float8, abs_3m)::float8 AS r
      FROM (
        SELECT month, department_code, left_this_month,
               (sum(absent_days) OVER w)::float8 / nullif(sum(work_days) OVER w, 0) AS abs_3m
        FROM employee_months
        WINDOW w AS (PARTITION BY employee_id ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
      ) x
      WHERE ${where}`),
  ]);
  const g = groups[0] ?? { l_emp: 0, l_ab: 0, l_wd: 0, s_emp: 0, s_ab: 0, s_wd: 0 };
  const leavers = { employees: g.l_emp, absenteeism_pct: absenteeismPct(g.l_ab, g.l_wd) };
  const stayers = { employees: g.s_emp, absenteeism_pct: absenteeismPct(g.s_ab, g.s_wd) };
  return {
    leavers,
    stayers,
    ratio: ratio(leavers.absenteeism_pct, stayers.absenteeism_pct),
    r_absence: corr[0]?.r ?? null,
  };
}

export async function readFindings(db: Db, f: Filters): Promise<Finding[] | null> {
  const [site, departments, overtime, absence] = await Promise.all([
    readSummary(db, { ...f, dept: null }),
    readDepartments(db, f),
    readOvertimeLeave(db, f),
    readAbsenceLeave(db, f),
  ]);
  if (!site || !departments || !overtime || !absence) return null;
  return buildFindings({ site, departments, overtime, absence });
}
