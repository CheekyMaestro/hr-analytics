/**
 * PRD.md Appendix A — reference figures for seed 20251231, full year 2025, all
 * departments. Counts must match exactly, rates within ±0.05 percentage points;
 * money, hours and ratios must match at their display precision.
 */
import type { Db } from "@/db/drivers";
import type { DepartmentCode, Filters } from "@/lib/domain/filters";
import type { RiskLevel } from "@/lib/domain/risk";
import {
  readAbsenceLeave,
  readDepartments,
  readDqIssues,
  readDqSummary,
  readMeta,
  readMonthly,
  readOvertimeLeave,
  readSummary,
} from "@/lib/queries/readers";

export const APPENDIX_A = {
  rawMonthlyRows: 4514,
  duplicateRows: 20,
  cleanMonthlyRows: 4494,
  employees: 400,
  leavers: 62,
  headcountStart: 400,
  headcountEnd: 338,
  leaversPerMonth: [3, 4, 4, 5, 5, 6, 7, 6, 4, 5, 5, 8],
  turnoverPerMonth: [0.75, 1.01, 1.02, 1.29, 1.3, 1.58, 1.88, 1.64, 1.11, 1.4, 1.42, 2.31],
  turnoverMonthlyAvg: 1.39,
  turnoverAnnual: 16.6,
  absenteeismPerMonth: [2.9, 3.0, 3.1, 3.3, 3.2, 3.4, 3.6, 3.5, 3.1, 3.0, 3.2, 3.5],
  absenteeism: 3.2,
  overtimeCostBillion: 6.35,
  overtimeHoursPerEmployeeMonth: 30,
  overtimeNullRows: 312,
  overtimeNullPct: 6.9,
  dirtyMonthly: 1126,
  dirtyEmployees: 97,
  departmentSpellings: 16,
  departments: [
    { code: "hauling", headcount: 120, leavers: 26, turnover: 2.02, absenteeism: 4.1, otHours: 41, costBillion: 2.41, risk: "tinggi" },
    { code: "mining_ops", headcount: 110, leavers: 17, turnover: 1.4, absenteeism: 3.4, otHours: 33, costBillion: 1.86, risk: "sedang" },
    { code: "plant_maint", headcount: 80, leavers: 11, turnover: 1.23, absenteeism: 3.0, otHours: 30, costBillion: 1.32, risk: "sedang" },
    { code: "hse", headcount: 35, leavers: 4, turnover: 1.01, absenteeism: 2.2, otHours: 18, costBillion: 0.39, risk: "rendah" },
    { code: "finance", headcount: 25, leavers: 2, turnover: 0.69, absenteeism: 1.8, otHours: 8, costBillion: 0.15, risk: "rendah" },
    { code: "hr_ga", headcount: 30, leavers: 2, turnover: 0.57, absenteeism: 2.0, otHours: 10, costBillion: 0.22, risk: "rendah" },
  ] satisfies Array<{ code: DepartmentCode; risk: RiskLevel } & Record<string, unknown>>,
  buckets: [
    { bucket: "le20", rows: 1650, leavers: 13, rate: 0.79 },
    { bucket: "20to40", rows: 1780, leavers: 25, rate: 1.4 },
    { bucket: "gt40", rows: 1064, leavers: 24, rate: 2.26 },
  ],
  bucketRatio: 2.9,
  bucketRatioExclImputed: 2.8,
  absenceLeaversLast3: 6.8,
  absenceStayers: 2.9,
} as const;

const RATE_TOL = 0.05 + 1e-9;
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** Compare the database against Appendix A; returns human-readable drift lines (empty = OK). */
export async function verifyAppendixA(db: Db): Promise<string[]> {
  const drift: string[] = [];
  const eq = (label: string, got: number | null | undefined, want: number) => {
    if (got !== want) drift.push(`${label}: ${got} ≠ ${want}`);
  };
  const near = (label: string, got: number | null | undefined, want: number) => {
    if (got === null || got === undefined || Math.abs(got - want) > RATE_TOL) drift.push(`${label}: ${got} ≉ ${want}`);
  };
  const at = (label: string, got: number | null | undefined, want: number, digits: number) => {
    if (got === null || got === undefined || round(got, digits) !== want) drift.push(`${label}: ${got} → ${want}`);
  };

  const meta = await readMeta(db);
  if (!meta) return ["Tidak ada run yang berhasil"];
  const f: Filters = { from: meta.months[0]!, to: meta.months[meta.months.length - 1]!, dept: null };
  const [summary, monthly, departments, ot, absence, dq, issues] = await Promise.all([
    readSummary(db, f),
    readMonthly(db, f),
    readDepartments(db, f),
    readOvertimeLeave(db, f),
    readAbsenceLeave(db, f),
    readDqSummary(db),
    readDqIssues(db),
  ]);
  if (!summary || !monthly || !departments || !ot || !absence || !dq || !issues) return ["Data tidak lengkap"];
  const A = APPENDIX_A;

  eq("baris mentah", dq.raw_rows, A.rawMonthlyRows);
  eq("duplikat", dq.duplicate_rows, A.duplicateRows);
  eq("baris bersih", dq.clean_rows, A.cleanMonthlyRows);
  eq("karyawan", meta.sources.employee_rows, A.employees);
  eq("lembur kosong", dq.overtime_null_rows, A.overtimeNullRows);
  at("lembur kosong %", dq.overtime_null_pct, A.overtimeNullPct, 1);
  eq("ejaan departemen", dq.department_spellings, A.departmentSpellings);
  eq("DQ-01", issues.find((i) => i.code === "DQ-01")?.rows_affected, A.dirtyMonthly);
  eq("DQ-02", issues.find((i) => i.code === "DQ-02")?.rows_affected, A.dirtyEmployees);
  for (const code of ["DQ-05", "DQ-06", "DQ-07", "DQ-08"]) eq(code, issues.find((i) => i.code === code)?.rows_affected, 0);

  eq("keluar", summary.leavers, A.leavers);
  eq("headcount awal", summary.headcount_start, A.headcountStart);
  eq("headcount akhir", summary.headcount_end, A.headcountEnd);
  near("turnover rata-rata", summary.turnover_monthly_avg_pct, A.turnoverMonthlyAvg);
  near("turnover tahunan", summary.turnover_annual_pct, A.turnoverAnnual);
  near("absenteeism", summary.absenteeism_pct, A.absenteeism);
  at("biaya lembur (M)", summary.overtime_cost_idr / 1e9, A.overtimeCostBillion, 2);
  at("lembur/orang/bulan", summary.overtime_hours_per_employee_month, A.overtimeHoursPerEmployeeMonth, 0);
  eq("jumlah bulan", monthly.length, 12);
  monthly.forEach((m, i) => {
    eq(`keluar ${m.month}`, m.leavers, A.leaversPerMonth[i]!);
    near(`turnover ${m.month}`, m.turnover_pct, A.turnoverPerMonth[i]!);
    near(`absenteeism ${m.month}`, m.absenteeism_pct, A.absenteeismPerMonth[i]!);
  });

  A.departments.forEach((want, i) => {
    const got = departments[i];
    if (got?.code !== want.code) drift.push(`urutan departemen #${i + 1}: ${got?.code} ≠ ${want.code}`);
    const d = departments.find((x) => x.code === want.code);
    if (!d) return;
    eq(`${want.code} headcount`, d.headcount_start, want.headcount);
    eq(`${want.code} keluar`, d.leavers, want.leavers);
    near(`${want.code} turnover`, d.turnover_pct, want.turnover);
    near(`${want.code} absenteeism`, d.absenteeism_pct, want.absenteeism);
    at(`${want.code} lembur jam`, d.overtime_hours_per_employee_month, want.otHours, 0);
    at(`${want.code} biaya (M)`, d.overtime_cost_idr / 1e9, want.costBillion, 2);
    if (d.risk_level !== want.risk) drift.push(`${want.code} risiko: ${d.risk_level} ≠ ${want.risk}`);
  });

  A.buckets.forEach((want) => {
    const b = ot.buckets.find((x) => x.bucket === want.bucket);
    eq(`bucket ${want.bucket} baris`, b?.rows, want.rows);
    eq(`bucket ${want.bucket} keluar`, b?.leavers, want.leavers);
    near(`bucket ${want.bucket} rate`, b?.leave_rate_pct, want.rate);
  });
  at("rasio bucket", ot.ratio_high_low, A.bucketRatio, 1);
  at("rasio bucket tanpa imputasi", ot.ratio_high_low_excl_imputed, A.bucketRatioExclImputed, 1);
  near("absen leaver 3 bln", absence.leavers.absenteeism_pct, A.absenceLeaversLast3);
  near("absen stayer", absence.stayers.absenteeism_pct, A.absenceStayers);
  eq("leaver (karyawan)", absence.leavers.employees, A.leavers);
  eq("stayer (karyawan)", absence.stayers.employees, A.headcountEnd);
  return drift;
}
