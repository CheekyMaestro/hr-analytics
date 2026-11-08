import { RiskBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatAbsenteeism, formatHours, formatInt, formatRupiah, formatRupiahShort, formatTurnover } from "@/lib/domain/format";
import type { DepartmentRow, Summary } from "@/lib/queries/types";

const th = "px-4 py-3 text-small font-bold text-muted whitespace-nowrap";
const num = "tabular px-4 py-3 text-right whitespace-nowrap";

/** Detail per departemen (FR-17) with a site total row. */
export function DepartmentTable({ rows, site, selected }: { rows: DepartmentRow[]; site: Summary; selected: string | null }) {
  return (
    <div className="overflow-x-auto" role="region" aria-label="Detail per departemen (geser ke samping)" tabIndex={0}>
      <table className="w-full min-w-[820px] border-collapse text-body-sm">
        <caption className="sr-only">Detail per departemen</caption>
        <thead className="bg-surface-muted">
          <tr>
            <th scope="col" className={cn(th, "rounded-l-sm text-left")}>Departemen</th>
            <th scope="col" className={cn(th, "text-right")}>Headcount awal</th>
            <th scope="col" className={cn(th, "text-right")}>Keluar</th>
            <th scope="col" className={cn(th, "text-right")}>Turnover/bln</th>
            <th scope="col" className={cn(th, "text-right")}>Absenteeism</th>
            <th scope="col" className={cn(th, "text-right")}>Lembur/orang/bln</th>
            <th scope="col" className={cn(th, "text-right")}>Biaya lembur</th>
            <th scope="col" className={cn(th, "rounded-r-sm text-left")}>Risiko</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.code} className={cn("h-[52px] border-b border-border", selected === d.code && "bg-soft")}>
              <th scope="row" className="px-4 py-3 text-left font-semibold whitespace-nowrap">{d.name}</th>
              <td className={num}>{formatInt(d.headcount_start)}</td>
              <td className={num}>{formatInt(d.leavers)}</td>
              <td className={num}>{formatTurnover(d.turnover_pct)}</td>
              <td className={num}>{formatAbsenteeism(d.absenteeism_pct)}</td>
              <td className={num}>{formatHours(d.overtime_hours_per_employee_month)}</td>
              <td className={num} title={formatRupiah(d.overtime_cost_idr)}>{formatRupiahShort(d.overtime_cost_idr)}</td>
              <td className="px-4 py-3"><RiskBadge level={d.risk_level} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="h-[52px] font-bold">
            <th scope="row" className="px-4 py-3 text-left">Total site</th>
            <td className={num}>{formatInt(site.headcount_start)}</td>
            <td className={num}>{formatInt(site.leavers)}</td>
            <td className={num}>{formatTurnover(site.turnover_monthly_avg_pct)}</td>
            <td className={num}>{formatAbsenteeism(site.absenteeism_pct)}</td>
            <td className={num}>{formatHours(site.overtime_hours_per_employee_month)}</td>
            <td className={num} title={formatRupiah(site.overtime_cost_idr)}>{formatRupiahShort(site.overtime_cost_idr)}</td>
            <td className="px-4 py-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
