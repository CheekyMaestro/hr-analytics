import { SrTable } from "@/components/ui/sr-table";
import { formatCorrelation, formatInt, formatRatio, formatTurnover } from "@/lib/domain/format";
import type { OvertimeLeave as Data } from "@/lib/queries/types";

/** BucketBars "Lembur vs keluar" (FR-13): pure CSS bars, the highest bucket in series-2. */
export function OvertimeLeave({ data }: { data: Data }) {
  const max = Math.max(...data.buckets.map((b) => b.leave_rate_pct), 0);
  const high = data.buckets[data.buckets.length - 1];
  const summary = data.buckets.map((b) => `${b.label}: ${formatTurnover(b.leave_rate_pct)}`).join(", ");
  return (
    <div>
      <ul className="flex flex-col gap-4" aria-label={`Tingkat keluar per bulan menurut lembur 3 bulan. ${summary}.`}>
        {data.buckets.map((b) => (
          <li key={b.bucket} aria-hidden>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-body-sm">
              <span className="font-semibold">{b.label}</span>
              <span className="tabular font-bold">{formatTurnover(b.leave_rate_pct)}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-pill bg-surface-muted">
              <div
                className={b.bucket === "gt40" ? "h-full rounded-pill bg-series-2" : "h-full rounded-pill bg-primary"}
                style={{ width: `${max > 0 ? (100 * b.leave_rate_pct) / max : 0}%` }}
              />
            </div>
            <p className="tabular mt-1 text-small text-muted">
              {formatInt(b.leavers)} keluar dari {formatInt(b.rows)} baris
            </p>
          </li>
        ))}
      </ul>
      <SrTable
        caption="Lembur vs keluar"
        head={["Kelompok lembur", "Tingkat keluar", "Keluar", "Baris"]}
        rows={data.buckets.map((b) => [b.label, formatTurnover(b.leave_rate_pct), formatInt(b.leavers), formatInt(b.rows)])}
      />
      {high && data.ratio_high_low !== null && (
        <p className="mt-4 text-body-sm font-bold">
          Lembur {high.label}: {formatRatio(data.ratio_high_low)} lebih sering keluar
        </p>
      )}
      {data.r_overtime !== null && (
        <p className="tabular mt-1 text-small text-muted">Korelasi point-biserial r = {formatCorrelation(data.r_overtime)}</p>
      )}
    </div>
  );
}
