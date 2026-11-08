/**
 * KPI formulas — the single implementation of PRD.md §8.2 (RULES.md §1.3).
 * Percentages are returned in percent units (1.39, not 0.0139) at full precision;
 * rounding happens only in format.ts.
 */

/** Turnover bulanan: leavers in month m ÷ headcount in month m × 100%. */
export function turnoverPct(leavers: number, headcount: number): number {
  return headcount > 0 ? (100 * leavers) / headcount : 0;
}

/** Period turnover: average of the monthly values. */
export function turnoverMonthlyAvgPct(months: ReadonlyArray<{ leavers: number; headcount: number }>): number {
  if (months.length === 0) return 0;
  return months.reduce((acc, m) => acc + turnoverPct(m.leavers, m.headcount), 0) / months.length;
}

/** Turnover tahunan: total leavers ÷ average monthly headcount × 100%. */
export function turnoverAnnualPct(months: ReadonlyArray<{ leavers: number; headcount: number }>): number {
  if (months.length === 0) return 0;
  const leavers = months.reduce((a, m) => a + m.leavers, 0);
  const avgHeadcount = months.reduce((a, m) => a + m.headcount, 0) / months.length;
  return avgHeadcount > 0 ? (100 * leavers) / avgHeadcount : 0;
}

/** Absenteeism rate: Σ absent_days ÷ Σ work_days × 100%. */
export function absenteeismPct(absentDays: number, workDays: number): number {
  return workDays > 0 ? (100 * absentDays) / workDays : 0;
}

/** Standard monthly-to-hourly divisor and the simplified overtime multiplier. */
export const HOURS_PER_MONTH_DIVISOR = 173;
export const OVERTIME_MULTIPLIER = 1.5;

/** Biaya lembur for one employee-month, whole rupiah: hours × (salary ÷ 173) × 1.5. */
export function overtimeCostIdr(hours: number, baseSalaryIdr: number): number {
  return Math.round((hours * baseSalaryIdr * OVERTIME_MULTIPLIER) / HOURS_PER_MONTH_DIVISOR);
}

/** Leave rate per group: rows with left_this_month ÷ all rows in the group × 100%. */
export function leaveRatePct(leavers: number, rows: number): number {
  return rows > 0 ? (100 * leavers) / rows : 0;
}

/** Ratio a ÷ b, or null when b is 0. */
export function ratio(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

/** Share of a part in a total (%). */
export function sharePct(part: number, total: number): number {
  return total > 0 ? (100 * part) / total : 0;
}

/** Overtime buckets (3-month rolling average, PRD.md §8.3). */
export const OVERTIME_BUCKETS = ["le20", "20to40", "gt40"] as const;
export type OvertimeBucket = (typeof OVERTIME_BUCKETS)[number];

export function overtimeBucket(avgHours: number): OvertimeBucket {
  if (avgHours <= 20) return "le20";
  if (avgHours <= 40) return "20to40";
  return "gt40";
}

/** UI labels of the overtime buckets. */
export const OVERTIME_BUCKET_LABEL: Record<OvertimeBucket, string> = {
  le20: "≤ 20 jam",
  "20to40": "20–40 jam",
  gt40: "> 40 jam",
};

/** Rolling window (months) for overtime buckets and "absen sebelum keluar". */
export const ROLLING_WINDOW_MONTHS = 3;
