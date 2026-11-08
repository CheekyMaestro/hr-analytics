import { SrTable } from "@/components/ui/sr-table";
import { DEPARTMENT_COLOR } from "@/lib/chart-theme";
import { formatDecimal, formatRupiah, formatRupiahShort } from "@/lib/domain/format";
import type { DepartmentRow } from "@/lib/queries/types";
import { CostDonutRing } from "./cost-donut";

/** CostDonut (FR-15): ring + total in the centre + 2-column legend with value and %. */
export function CostBreakdown({ rows, totalLabel, selected }: { rows: DepartmentRow[]; totalLabel: string; selected: string | null }) {
  const ordered = [...rows].sort((a, b) => b.overtime_cost_idr - a.overtime_cost_idr);
  const total = rows.reduce((a, r) => a + r.overtime_cost_idr, 0);
  const label = `Biaya lembur per departemen, total ${formatRupiahShort(total)}: ${ordered
    .map((r) => `${r.name} ${formatRupiahShort(r.overtime_cost_idr)} (${formatDecimal(r.cost_share_pct, 0)}%)`)
    .join(", ")}.`;
  return (
    <div>
      <div role="img" aria-label={label} className="relative mx-auto h-[168px] w-[168px]">
        <CostDonutRing data={ordered.map((r) => ({ code: r.code, name: r.name, value: r.overtime_cost_idr }))} selected={selected} />
        <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-donut">{formatRupiahShort(total)}</span>
          <span className="text-small text-muted">{totalLabel}</span>
        </div>
      </div>
      <ul aria-hidden className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
        {ordered.map((r) => (
          <li key={r.code} className={selected && selected !== r.code ? "opacity-60" : undefined} title={formatRupiah(r.overtime_cost_idr)}>
            <span className="flex items-center gap-2 text-small font-semibold">
              <span className="h-2.5 w-2.5 shrink-0 rounded-pill" style={{ background: DEPARTMENT_COLOR[r.code] }} />
              <span className="truncate">{r.name}</span>
            </span>
            <span className="tabular block pl-4.5 text-small text-muted">
              {formatRupiahShort(r.overtime_cost_idr)} · {formatDecimal(r.cost_share_pct, 0)}%
            </span>
          </li>
        ))}
      </ul>
      <SrTable
        caption="Biaya lembur per departemen"
        head={["Departemen", "Biaya lembur", "Porsi"]}
        rows={ordered.map((r) => [r.name, formatRupiah(r.overtime_cost_idr), `${formatDecimal(r.cost_share_pct, 1)}%`])}
      />
    </div>
  );
}
