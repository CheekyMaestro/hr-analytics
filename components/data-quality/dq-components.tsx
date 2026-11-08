import { ArrowRight } from "lucide-react";
import { DqStatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatDecimal, formatInt, formatRatio } from "@/lib/domain/format";
import type { KpiDefinition as Def } from "@/content/kpi-definitions";
import type { DqAlias, DqIssue, OvertimeNull } from "@/lib/queries/types";

export function DqStatCard({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <article className="print-card min-w-0 rounded-card bg-surface p-5 shadow-card">
      <h2 className="text-body-sm font-semibold text-muted">{title}</h2>
      <p className="tabular mt-2 text-stat">{value}</p>
      {note && <p className="mt-1 text-small text-muted">{note}</p>}
    </article>
  );
}

const th = "px-4 py-3 text-left text-small font-bold text-muted whitespace-nowrap";

/** Log masalah data (FR-21). */
export function IssueTable({ issues }: { issues: DqIssue[] }) {
  return (
    <div className="overflow-x-auto" role="region" aria-label="Log masalah data (geser ke samping)" tabIndex={0}>
      <table className="w-full min-w-[820px] border-collapse text-body-sm">
        <caption className="sr-only">Log masalah data</caption>
        <thead className="bg-surface-muted">
          <tr>
            <th scope="col" className={cn(th, "rounded-l-sm")}>ID</th>
            <th scope="col" className={th}>Tabel · kolom</th>
            <th scope="col" className={th}>Masalah</th>
            <th scope="col" className={cn(th, "text-right")}>Baris</th>
            <th scope="col" className={th}>Tindakan</th>
            <th scope="col" className={cn(th, "rounded-r-sm")}>Status</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((i) => (
            <tr key={i.code} className="h-[52px] border-b border-border last:border-0">
              <th scope="row" className="px-4 py-3 text-left font-mono text-small font-normal whitespace-nowrap">{i.code}</th>
              <td className="px-4 py-3 font-mono text-small whitespace-nowrap">
                {i.table_name} · {i.column_name}
              </td>
              <td className="px-4 py-3 font-semibold">{i.description}</td>
              <td className="tabular px-4 py-3 text-right">{formatInt(i.rows_affected)}</td>
              <td className="px-4 py-3 text-muted">{i.action}</td>
              <td className="px-4 py-3"><DqStatusBadge status={i.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Penyeragaman nama departemen (FR-22): raw spelling → canonical name, rows in monthly. */
export function AliasList({ aliases }: { aliases: DqAlias[] }) {
  const monthly = aliases.filter((a) => a.table_name === "monthly");
  const master = aliases.filter((a) => a.table_name === "employees");
  const masterByRaw = new Map(master.map((a) => [a.raw_value, a.rows]));
  return (
    <div>
      <ul className="divide-y divide-border">
        {monthly.map((a) => (
          <li key={a.raw_value} className="grid grid-cols-[minmax(0,9rem)_16px_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
            <code className="truncate rounded-sm bg-surface-muted px-2 py-1 font-mono text-small whitespace-pre" title={JSON.stringify(a.raw_value)}>
              {a.raw_value}
            </code>
            <ArrowRight aria-label="menjadi" size={16} strokeWidth={1.75} className="text-muted" />
            <span className="truncate text-body-sm font-semibold">{a.department_name}</span>
            <span className="tabular text-right text-small text-muted whitespace-nowrap">
              {formatInt(a.rows)} baris
              {masterByRaw.has(a.raw_value) && ` · ${formatInt(masterByRaw.get(a.raw_value)!)} master`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Penanganan lembur kosong (FR-23): count, %, per department, sensitivity check. */
export function OvertimeNullPanel({ data }: { data: OvertimeNull }) {
  const max = Math.max(...data.by_department.map((d) => d.rows), 0);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-muted">
        <span className="tabular font-bold text-text">{formatInt(data.total)}</span> baris ({formatDecimal(data.pct, 1)}% dari data
        bersih) tidak punya nilai lembur. Nilainya diisi 0 jam dan ditandai <code className="font-mono text-small">ot_imputed</code>{" "}
        supaya bisa dikecualikan saat analisis.
      </p>
      <ul className="flex flex-col gap-2.5" aria-label="Lembur kosong per departemen">
        {data.by_department.map((d) => (
          <li key={d.code} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-small">
            <span className="truncate font-semibold">{d.name}</span>
            <span aria-hidden className="h-3 overflow-hidden rounded-pill bg-surface-muted">
              <span className="block h-full rounded-pill bg-primary" style={{ width: `${max ? (100 * d.rows) / max : 0}%` }} />
            </span>
            <span className="tabular text-right text-muted">{formatInt(d.rows)}</span>
          </li>
        ))}
      </ul>
      <div className="rounded-md bg-soft p-3 text-body-sm">
        <p className="font-bold">Uji sensitivitas</p>
        <p>
          Rasio keluar lembur &gt; 40 vs ≤ 20 jam:{" "}
          <span className="tabular font-bold">{data.sensitivity.ratio_all === null ? "–" : formatRatio(data.sensitivity.ratio_all)}</span>{" "}
          dengan semua baris,{" "}
          <span className="tabular font-bold">
            {data.sensitivity.ratio_excl_imputed === null ? "–" : formatRatio(data.sensitivity.ratio_excl_imputed)}
          </span>{" "}
          tanpa baris yang diisi 0.
          {data.sensitivity.ratio_all !== null &&
            data.sensitivity.ratio_excl_imputed !== null &&
            data.sensitivity.ratio_all > 1 === data.sensitivity.ratio_excl_imputed > 1 &&
            " Arah hubungannya tetap sama."}
        </p>
      </div>
      <p className="text-small font-semibold text-warning">Perlu konfirmasi tim payroll sebelum dipakai untuk keputusan biaya.</p>
    </div>
  );
}

export function KpiDefinitionCard({ def }: { def: Def }) {
  return (
    <article className="print-card rounded-card bg-surface p-5 shadow-card">
      <h3 className="text-h3">{def.name}</h3>
      <pre className="mt-2 rounded-sm bg-surface-muted px-3 py-2 font-mono text-small whitespace-pre-wrap">{def.formula}</pre>
      <p className="mt-2 text-body-sm text-muted">{def.note}</p>
    </article>
  );
}
