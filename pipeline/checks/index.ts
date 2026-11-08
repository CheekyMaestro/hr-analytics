/**
 * Data quality checks DQ-01 … DQ-08 (SCHEMA.md §4.3). Each runs inside the clean
 * transaction against the staging tables created by pipeline/clean.ts and writes
 * exactly one dq_issues row per run, also when rows_affected = 0 (RULES.md §4).
 */
import { sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db/drivers";
import type { DqStatus } from "@/lib/queries/types";

export type DqIssueRow = {
  code: string;
  table_name: "employees" | "monthly";
  column_name: string;
  kind: "fix" | "check";
  description: string;
  rows_affected: number;
  action: string;
  status: DqStatus;
};

type CheckDef = {
  code: string;
  table_name: "employees" | "monthly";
  column_name: string;
  kind: "fix" | "check";
  description: string;
  /** Status when rows_affected > 0 (fixes only; failed checks are always `gagal`). */
  fixedStatus?: DqStatus;
  action: (rows: number) => string;
  count: SQL;
};

const NORM = (col: SQL) => sql`lower(btrim(regexp_replace(${col}, '\\s+', ' ', 'g')))`;

export const CHECKS: readonly CheckDef[] = [
  {
    code: "DQ-01",
    table_name: "monthly",
    column_name: "department",
    kind: "fix",
    description: "Nama departemen tidak seragam",
    fixedStatus: "diperbaiki",
    action: (n) => (n ? "Diseragamkan ke nama baku lewat tabel alias" : "Tidak ada tindakan"),
    count: sql`SELECT count(*)::int AS n FROM raw_monthly r
               WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.name = r.department)`,
  },
  {
    code: "DQ-02",
    table_name: "employees",
    column_name: "department",
    kind: "fix",
    description: "Nama departemen tidak seragam di data master",
    fixedStatus: "diperbaiki",
    action: (n) => (n ? "Diseragamkan ke nama baku lewat tabel alias" : "Tidak ada tindakan"),
    count: sql`SELECT count(*)::int AS n FROM raw_employees r
               WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.name = r.department)`,
  },
  {
    code: "DQ-03",
    table_name: "monthly",
    column_name: "*",
    kind: "fix",
    description: "Baris duplikat persis",
    fixedStatus: "diperbaiki",
    action: (n) => (n ? "Satu baris disimpan, salinannya dihapus" : "Tidak ada tindakan"),
    count: sql`SELECT ((SELECT count(*) FROM stg_monthly) - (SELECT count(*) FROM stg_dedup))::int AS n`,
  },
  {
    code: "DQ-04",
    table_name: "monthly",
    column_name: "overtime_hours",
    kind: "fix",
    description: "Nilai lembur kosong",
    fixedStatus: "perlu_konfirmasi",
    action: (n) => (n ? "Diisi 0 dan ditandai ot_imputed; perlu konfirmasi payroll" : "Tidak ada tindakan"),
    count: sql`SELECT count(*)::int AS n FROM stg_typed WHERE ot_imputed`,
  },
  {
    code: "DQ-05",
    table_name: "monthly",
    column_name: "absent_days",
    kind: "check",
    description: "Hari absen melebihi hari kerja",
    action: (n) => (n ? "Baris dikecualikan dari data bersih" : "Tidak ada tindakan"),
    count: sql`SELECT count(*)::int AS n FROM stg_typed WHERE absent_days > work_days`,
  },
  {
    code: "DQ-06",
    table_name: "monthly",
    column_name: "left_this_month",
    kind: "check",
    description: "Karyawan tercatat keluar lebih dari sekali",
    action: (n) => (n ? "Hanya tanda keluar pertama yang dipakai" : "Tidak ada tindakan"),
    count: sql`SELECT count(*)::int AS n FROM (
                 SELECT employee_id FROM stg_typed WHERE left_this_month GROUP BY employee_id HAVING count(*) > 1
               ) x`,
  },
  {
    code: "DQ-07",
    table_name: "monthly",
    column_name: "month",
    kind: "check",
    description: "Masih ada baris setelah bulan keluar",
    action: (n) => (n ? "Baris setelah bulan keluar dikecualikan" : "Tidak ada tindakan"),
    count: sql`SELECT count(*)::int AS n FROM stg_typed t
               JOIN (SELECT employee_id, min(month) AS exit_month FROM stg_typed WHERE left_this_month GROUP BY 1) f
                 USING (employee_id)
               WHERE t.month > f.exit_month`,
  },
  {
    code: "DQ-08",
    table_name: "monthly",
    column_name: "employee_id",
    kind: "check",
    description: "employee_id tidak ada di data master",
    action: (n) => (n ? "Baris dikecualikan dari data bersih" : "Tidak ada tindakan"),
    count: sql`SELECT count(*)::int AS n FROM stg_typed t
               WHERE NOT EXISTS (SELECT 1 FROM stg_employees e WHERE e.employee_id = t.employee_id)`,
  },
];

export function statusFor(def: Pick<CheckDef, "kind" | "fixedStatus">, rows: number): DqStatus {
  if (rows === 0) return "lolos";
  return def.kind === "check" ? "gagal" : (def.fixedStatus ?? "diperbaiki");
}

export async function runChecks(tx: Db): Promise<DqIssueRow[]> {
  const out: DqIssueRow[] = [];
  for (const def of CHECKS) {
    const [row] = await tx.query<{ n: number }>(def.count);
    const n = row?.n ?? 0;
    out.push({
      code: def.code,
      table_name: def.table_name,
      column_name: def.column_name,
      kind: def.kind,
      description: def.description,
      rows_affected: n,
      action: def.action(n),
      status: statusFor(def, n),
    });
  }
  return out;
}

/** SQL expression normalising a raw department spelling (RULES.md §4). */
export const normalizeDepartment = NORM;
