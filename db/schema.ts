/**
 * Drizzle schema — mirrors SCHEMA.md §3 and the SQL migrations in db/migrations.
 * Queries use the `sql` tagged template; this file documents the shapes and
 * lets `drizzle-kit` diff future changes.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  pgView,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const departments = pgTable(
  "departments",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull().unique(),
    shortCode: text("short_code").notNull().unique(),
    sortOrder: smallint("sort_order").notNull(),
  },
  (t) => [check("departments_code_check", sql`${t.code} ~ '^[a-z_]+$'`)],
);

export const departmentAliases = pgTable("department_aliases", {
  aliasNormalized: text("alias_normalized").primaryKey(),
  departmentCode: text("department_code")
    .notNull()
    .references(() => departments.code),
  exampleRaw: text("example_raw").notNull(),
});

export const rawEmployees = pgTable("raw_employees", {
  sourceRow: integer("source_row").primaryKey(),
  employeeId: text("employee_id"),
  fullName: text("full_name"),
  department: text("department"),
  jobLevel: text("job_level"),
  hireDate: text("hire_date"),
  baseSalary: text("base_salary"),
  employmentType: text("employment_type"),
});

export const rawMonthly = pgTable("raw_monthly", {
  sourceRow: integer("source_row").primaryKey(),
  employeeId: text("employee_id"),
  month: text("month"),
  department: text("department"),
  workDays: text("work_days"),
  absentDays: text("absent_days"),
  overtimeHours: text("overtime_hours"),
  leftThisMonth: text("left_this_month"),
});

export const dqRuns = pgTable(
  "dq_runs",
  {
    id: uuid("id").primaryKey(),
    seed: integer("seed"),
    gitSha: text("git_sha"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: text("status").notNull(),
    rawEmployeeRows: integer("raw_employee_rows"),
    rawMonthlyRows: integer("raw_monthly_rows"),
    duplicateRows: integer("duplicate_rows"),
    cleanMonthlyRows: integer("clean_monthly_rows"),
    overtimeNullRows: integer("overtime_null_rows"),
    departmentSpellings: integer("department_spellings"),
    errorMessage: text("error_message"),
  },
  (t) => [index("idx_dq_runs_latest").on(t.finishedAt.desc()).where(sql`${t.status} = 'succeeded'`)],
);

export const dqIssues = pgTable(
  "dq_issues",
  {
    runId: uuid("run_id")
      .notNull()
      .references(() => dqRuns.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    tableName: text("table_name").notNull(),
    columnName: text("column_name").notNull(),
    kind: text("kind").notNull(),
    description: text("description").notNull(),
    rowsAffected: integer("rows_affected").notNull(),
    action: text("action").notNull(),
    status: text("status").notNull(),
  },
  (t) => [primaryKey({ columns: [t.runId, t.code] })],
);

export const dqAliasHits = pgTable(
  "dq_alias_hits",
  {
    runId: uuid("run_id")
      .notNull()
      .references(() => dqRuns.id, { onDelete: "cascade" }),
    tableName: text("table_name").notNull(),
    rawValue: text("raw_value").notNull(),
    departmentCode: text("department_code")
      .notNull()
      .references(() => departments.code),
    isCanonical: boolean("is_canonical").notNull(),
    rows: integer("rows").notNull(),
  },
  (t) => [primaryKey({ columns: [t.runId, t.tableName, t.rawValue] })],
);

export const employees = pgTable(
  "employees",
  {
    employeeId: text("employee_id").primaryKey(),
    fullName: text("full_name").notNull(),
    departmentCode: text("department_code")
      .notNull()
      .references(() => departments.code),
    jobLevel: text("job_level").notNull(),
    hireDate: date("hire_date").notNull(),
    baseSalaryIdr: bigint("base_salary_idr", { mode: "number" }).notNull(),
    employmentType: text("employment_type").notNull(),
  },
  (t) => [index("idx_employees_department").on(t.departmentCode)],
);

export const employeeMonths = pgTable(
  "employee_months",
  {
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.employeeId),
    month: date("month").notNull(),
    departmentCode: text("department_code")
      .notNull()
      .references(() => departments.code),
    workDays: smallint("work_days").notNull(),
    absentDays: smallint("absent_days").notNull(),
    overtimeHours: numeric("overtime_hours", { precision: 6, scale: 2 }).notNull(),
    otImputed: boolean("ot_imputed").notNull().default(false),
    leftThisMonth: boolean("left_this_month").notNull(),
    otCostIdr: bigint("ot_cost_idr", { mode: "number" }).notNull(),
    otHours3mAvg: numeric("ot_hours_3m_avg", { precision: 6, scale: 2 }).notNull(),
    otBucket: text("ot_bucket").notNull(),
    monthsToExit: smallint("months_to_exit"),
    isStayer: boolean("is_stayer").notNull(),
    runId: uuid("run_id")
      .notNull()
      .references(() => dqRuns.id),
  },
  (t) => [
    primaryKey({ columns: [t.employeeId, t.month] }),
    index("idx_employee_months_month_dept").on(t.month, t.departmentCode),
    index("idx_employee_months_exit").on(t.monthsToExit).where(sql`${t.monthsToExit} IS NOT NULL`),
    uniqueIndex("uq_employee_months_one_exit").on(t.employeeId).where(sql`${t.leftThisMonth}`),
    check("ck_employee_months_absent", sql`${t.absentDays} <= ${t.workDays}`),
    check("ck_employee_months_exit", sql`NOT ${t.leftThisMonth} OR ${t.monthsToExit} = 0`),
  ],
);

export const vMonthDepartment = pgView("v_month_department", {
  month: date("month"),
  departmentCode: text("department_code"),
  headcount: bigint("headcount", { mode: "number" }),
  leavers: bigint("leavers", { mode: "number" }),
  absentDays: bigint("absent_days", { mode: "number" }),
  workDays: bigint("work_days", { mode: "number" }),
  overtimeHours: numeric("overtime_hours"),
  otCostIdr: numeric("ot_cost_idr"),
}).existing();
