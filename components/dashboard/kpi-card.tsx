import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function KpiCard({ title, value, note, danger }: { title: string; value: string; note: string; danger?: boolean }) {
  return (
    <article className="print-card min-w-0 rounded-card bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-body-sm font-semibold text-muted">{title}</h2>
        <span aria-hidden className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill border-[1.5px] border-primary text-primary">
          <ArrowUpRight size={16} strokeWidth={1.75} />
        </span>
      </div>
      <p className="tabular mt-2 text-kpi">{value}</p>
      <p className={cn("mt-1 text-small font-medium", danger ? "text-danger" : "text-muted")}>{note}</p>
    </article>
  );
}
