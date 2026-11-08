/**
 * Generator design targets — the *injected patterns* of PRD.md §7.
 *
 * These are inputs to the dummy-data generator, not figures shown in the UI.
 * The UI only ever shows numbers computed from the database; the golden test
 * (tests/golden) checks that those computed numbers equal PRD.md Appendix A.
 */

export const DEFAULT_SEED = 20251231;
export const YEAR = 2025;
export const MONTHS = 12;

export type DeptCode = "hauling" | "mining_ops" | "plant_maint" | "hse" | "hr_ga" | "finance";

export type DeptSpec = {
  code: DeptCode;
  name: string;
  /** Field roster (6-1) vs office roster (5-2). */
  field: boolean;
  headcount: number;
  leavers: number;
  /** Target average monthly turnover (%). */
  turnoverAvgPct: number;
  /** Target absenteeism (%). */
  absenteeismPct: number;
  /** Target mean overtime hours per employee-month. */
  overtimeMean: number;
  /** Target overtime cost for the year (IDR). */
  overtimeCostIdr: number;
  /** Leave-month overtime bucket of the leavers: [le20, 20to40, gt40]. */
  leaverBuckets: [number, number, number];
  /** Non-canonical raw spellings: [spelling, rows in monthly, rows in employees]. */
  dirty: Array<[string, number, number]>;
};

export const DEPTS: readonly DeptSpec[] = [
  {
    code: "hauling",
    name: "Hauling",
    field: true,
    headcount: 120,
    leavers: 26,
    turnoverAvgPct: 2.02,
    absenteeismPct: 4.1,
    overtimeMean: 41,
    overtimeCostIdr: 2_410_000_000,
    leaverBuckets: [2, 9, 15],
    dirty: [
      ["HAULING ", 188, 16],
      ["Haul", 140, 12],
    ],
  },
  {
    code: "mining_ops",
    name: "Mining Operations",
    field: true,
    headcount: 110,
    leavers: 17,
    turnoverAvgPct: 1.4,
    absenteeismPct: 3.4,
    overtimeMean: 33,
    overtimeCostIdr: 1_860_000_000,
    leaverBuckets: [2, 9, 6],
    dirty: [
      ["Mining Ops", 212, 18],
      ["MINING OPS", 96, 8],
      ["mining operation", 64, 6],
    ],
  },
  {
    code: "plant_maint",
    name: "Plant & Maintenance",
    field: true,
    headcount: 80,
    leavers: 11,
    turnoverAvgPct: 1.23,
    absenteeismPct: 3.0,
    overtimeMean: 30,
    overtimeCostIdr: 1_320_000_000,
    leaverBuckets: [2, 6, 3],
    dirty: [
      ["Plant&Maint", 150, 13],
      ["Maintenance", 98, 8],
    ],
  },
  {
    code: "hse",
    name: "HSE",
    field: true,
    headcount: 35,
    leavers: 4,
    turnoverAvgPct: 1.01,
    absenteeismPct: 2.2,
    overtimeMean: 18,
    overtimeCostIdr: 390_000_000,
    leaverBuckets: [3, 1, 0],
    dirty: [["K3/HSE", 52, 5]],
  },
  {
    code: "hr_ga",
    name: "HR & GA",
    field: false,
    headcount: 30,
    leavers: 2,
    turnoverAvgPct: 0.57,
    absenteeismPct: 2.0,
    overtimeMean: 10,
    overtimeCostIdr: 220_000_000,
    leaverBuckets: [2, 0, 0],
    dirty: [["HRGA", 70, 6]],
  },
  {
    code: "finance",
    name: "Finance",
    field: false,
    headcount: 25,
    leavers: 2,
    turnoverAvgPct: 0.69,
    absenteeismPct: 1.8,
    overtimeMean: 8,
    overtimeCostIdr: 150_000_000,
    leaverBuckets: [2, 0, 0],
    dirty: [["Fin & Acc", 56, 5]],
  },
];

/** Leavers per month, Jan … Des. */
export const LEAVERS_PER_MONTH = [3, 4, 4, 5, 5, 6, 7, 6, 4, 5, 5, 8] as const;
/** Absenteeism per month (%), Jan … Des. */
export const ABSENTEEISM_PER_MONTH = [2.9, 3.0, 3.1, 3.3, 3.2, 3.4, 3.6, 3.5, 3.1, 3.0, 3.2, 3.5] as const;
/** Absenteeism of leavers over their last 3 months, and of stayers (%). */
export const ABSENTEEISM_LEAVERS_LAST3 = 6.8;
export const ABSENTEEISM_STAYERS = 2.9;
/** Rows per overtime bucket (3-month average) and leavers per bucket: le20, 20to40, gt40. */
export const BUCKET_ROWS = [1650, 1780, 1064] as const;
/** Bucket ratio (> 40 vs ≤ 20) after excluding imputed rows. */
export const SENSITIVITY_RATIO = 2.8;

export const OVERTIME_NULL_ROWS = 312;
export const DUPLICATE_ROWS = 20;

/** Scheduled working days per month from the roster (20–26). */
export const WORK_DAYS_FIELD = [26, 24, 26, 25, 26, 24, 26, 26, 25, 26, 25, 25] as const;
export const WORK_DAYS_OFFICE = [22, 20, 21, 21, 20, 21, 23, 21, 22, 23, 20, 22] as const;

export const JOB_LEVELS = ["Operator", "Staff", "Supervisor", "Superintendent", "Manager"] as const;
export type JobLevel = (typeof JOB_LEVELS)[number];

/** Job level mix (weights) and salary bands (IDR / month). */
export const JOB_MIX_FIELD = [0.7, 0.12, 0.12, 0.04, 0.02] as const;
export const JOB_MIX_OFFICE = [0, 0.66, 0.2, 0.08, 0.06] as const;
export const SALARY_BAND: Record<JobLevel, [number, number]> = {
  Operator: [4_200_000, 6_000_000],
  Staff: [5_500_000, 8_500_000],
  Supervisor: [9_000_000, 13_000_000],
  Superintendent: [15_000_000, 21_000_000],
  Manager: [24_000_000, 34_000_000],
};
