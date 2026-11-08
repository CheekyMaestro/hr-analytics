import { RiskBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatAbsenteeism, formatTurnover } from "@/lib/domain/format";
import type { DepartmentRow } from "@/lib/queries/types";

/** Risiko per departemen, sorted by monthly turnover (FR-12). */
export function RiskList({ rows, selected }: { rows: DepartmentRow[]; selected: string | null }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((d) => (
        <li
          key={d.code}
          className={cn("flex items-center gap-3 py-3 first:pt-0 last:pb-0", selected === d.code && "-mx-2 rounded-md bg-soft px-2 first:pt-3 last:pb-3")}
        >
          <span aria-hidden className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-soft text-small font-bold text-primary">
            {d.short_code}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-sm font-semibold">{d.name}</span>
            <span className="tabular block text-small text-muted">
              Turnover {formatTurnover(d.turnover_pct)} · absen {formatAbsenteeism(d.absenteeism_pct)}
            </span>
          </span>
          <RiskBadge level={d.risk_level} />
        </li>
      ))}
    </ul>
  );
}
