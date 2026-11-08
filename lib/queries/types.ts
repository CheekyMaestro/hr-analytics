/** Shapes returned by lib/queries — identical to the JSON API (ARCHITECTURE.md §6, snake_case). */
import type { DepartmentCode } from "@/lib/domain/filters";
import type { OvertimeBucket } from "@/lib/domain/kpi";
import type { RiskLevel } from "@/lib/domain/risk";

export type Summary = {
  headcount_start: number;
  headcount_end: number;
  leavers: number;
  turnover_monthly_avg_pct: number;
  turnover_annual_pct: number;
  absenteeism_pct: number;
  overtime_cost_idr: number;
  overtime_hours_per_employee_month: number;
};

export type MonthlyPoint = {
  month: string;
  headcount: number;
  leavers: number;
  turnover_pct: number;
  absenteeism_pct: number;
  overtime_hours: number;
  overtime_cost_idr: number;
};

export type DepartmentRow = {
  code: DepartmentCode;
  name: string;
  short_code: string;
  headcount_start: number;
  leavers: number;
  turnover_pct: number;
  absenteeism_pct: number;
  overtime_hours_per_employee_month: number;
  overtime_cost_idr: number;
  cost_share_pct: number;
  risk_level: RiskLevel;
};

export type BucketRow = {
  bucket: OvertimeBucket;
  label: string;
  rows: number;
  leavers: number;
  leave_rate_pct: number;
};

export type OvertimeLeave = {
  buckets: BucketRow[];
  ratio_high_low: number | null;
  ratio_high_low_excl_imputed: number | null;
  r_overtime: number | null;
};

export type GroupAbsence = { employees: number; absenteeism_pct: number };

export type AbsenceLeave = {
  leavers: GroupAbsence;
  stayers: GroupAbsence;
  ratio: number | null;
  r_absence: number | null;
};

export type Finding = { no: number; title: string; body: string; recommendation: string };

export type LatestRun = { id: string; finished_at: string; status: "succeeded" };

export type Meta = {
  months: string[];
  departments: Array<{ code: DepartmentCode; name: string; short_code: string }>;
  latest_run: LatestRun;
  sources: { employee_rows: number; monthly_raw_rows: number; monthly_clean_rows: number };
  failed_checks: number;
};

export type DqSummary = {
  run_id: string;
  finished_at: string;
  raw_rows: number;
  duplicate_rows: number;
  clean_rows: number;
  department_spellings: number;
  department_canonical: number;
  overtime_null_rows: number;
  overtime_null_pct: number;
};

export type DqStatus = "diperbaiki" | "perlu_konfirmasi" | "lolos" | "gagal";

export type DqIssue = {
  code: string;
  table_name: "employees" | "monthly";
  column_name: string;
  description: string;
  rows_affected: number;
  action: string;
  status: DqStatus;
};

export type DqAlias = {
  raw_value: string;
  department_code: DepartmentCode;
  department_name: string;
  table_name: "employees" | "monthly";
  rows: number;
};

export type OvertimeNull = {
  total: number;
  pct: number;
  by_department: Array<{ code: DepartmentCode; name: string; rows: number }>;
  sensitivity: { ratio_all: number | null; ratio_excl_imputed: number | null };
};

export type MonthlyExportRow = Record<string, string>;
