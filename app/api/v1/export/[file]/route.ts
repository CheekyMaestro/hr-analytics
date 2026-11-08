import type { NextRequest } from "next/server";
import { csvResponse, errorResponse, handleFiltered } from "@/lib/api";
import { getDepartments } from "@/lib/queries/dashboard";
import { getDqIssues, getMonthlyRows } from "@/lib/queries/data-quality";
import { MONTHLY_EXPORT_COLUMNS } from "@/lib/queries/readers/data-quality";
import { RISK_LABEL } from "@/lib/domain/risk";

const DEPARTMENT_COLUMNS = [
  "code",
  "name",
  "headcount_start",
  "leavers",
  "turnover_pct",
  "absenteeism_pct",
  "overtime_hours_per_employee_month",
  "overtime_cost_idr",
  "cost_share_pct",
  "risk_level",
] as const;

const DQ_COLUMNS = ["code", "table_name", "column_name", "description", "rows_affected", "action", "status"] as const;

/** CSV exports (FR-31): monthly.csv, departments.csv, dq-log.csv. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/v1/export/[file]">) {
  const { file } = await ctx.params;
  switch (file) {
    case "monthly.csv":
      return handleFiltered(request, (f) => getMonthlyRows(f), (rows, f) => csvResponse("monthly", f, MONTHLY_EXPORT_COLUMNS, rows));
    case "departments.csv":
      return handleFiltered(
        request,
        (f) => getDepartments(f),
        (rows, f) =>
          csvResponse(
            "departments",
            f,
            DEPARTMENT_COLUMNS,
            rows.map((r) => ({
              ...r,
              turnover_pct: r.turnover_pct.toFixed(4),
              absenteeism_pct: r.absenteeism_pct.toFixed(4),
              overtime_hours_per_employee_month: r.overtime_hours_per_employee_month.toFixed(2),
              overtime_cost_idr: Math.round(r.overtime_cost_idr),
              cost_share_pct: r.cost_share_pct.toFixed(2),
              risk_level: RISK_LABEL[r.risk_level],
            })),
          ),
      );
    case "dq-log.csv":
      return handleFiltered(request, () => getDqIssues(), (rows, f) => csvResponse("dq-log", f, DQ_COLUMNS, rows));
    default:
      return errorResponse(404, "not_found", undefined, "File ekspor tidak dikenal. Pilihan: monthly.csv, departments.csv, dq-log.csv.");
  }
}
