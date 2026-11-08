import { SrTable } from "@/components/ui/sr-table";
import { formatAbsenteeism, formatCorrelation, formatInt, formatRatio } from "@/lib/domain/format";
import { ROLLING_WINDOW_MONTHS } from "@/lib/domain/kpi";
import type { AbsenceLeave as Data } from "@/lib/queries/types";

/** PairBars "Absen sebelum keluar" (FR-14): leavers vs stayers. */
export function AbsenceLeave({ data }: { data: Data }) {
  const groups = [
    { key: "l", label: "Karyawan keluar", sub: `${ROLLING_WINDOW_MONTHS} bulan terakhir`, g: data.leavers, bar: "bg-series-2" },
    { key: "s", label: "Karyawan bertahan", sub: "seluruh periode", g: data.stayers, bar: "bg-primary" },
  ];
  const max = Math.max(data.leavers.absenteeism_pct, data.stayers.absenteeism_pct, 0);
  return (
    <div>
      <div
        role="img"
        aria-label={`Absensi karyawan keluar ${formatAbsenteeism(data.leavers.absenteeism_pct)}, karyawan bertahan ${formatAbsenteeism(data.stayers.absenteeism_pct)}.`}
        className="flex h-48 items-end justify-center gap-10"
      >
        {groups.map(({ key, g, bar }) => (
          <div key={key} className="flex h-full flex-col items-center justify-end gap-1.5">
            <span className="tabular text-h3">{formatAbsenteeism(g.absenteeism_pct)}</span>
            <div className={`w-16 rounded-md ${bar}`} style={{ height: `${max > 0 ? (80 * g.absenteeism_pct) / max : 0}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-10 text-center">
        {groups.map(({ key, label, sub, g }) => (
          <div key={key} className="w-28">
            <p className="text-small font-semibold">{label}</p>
            <p className="tabular text-small text-muted">
              {formatInt(g.employees)} orang · {sub}
            </p>
          </div>
        ))}
      </div>
      <SrTable
        caption="Absen sebelum keluar"
        head={["Kelompok", "Absensi", "Karyawan"]}
        rows={groups.map(({ label, g }) => [label, formatAbsenteeism(g.absenteeism_pct), formatInt(g.employees)])}
      />
      {data.ratio !== null && (
        <p className="mt-4 text-body-sm font-bold">Absensi menjelang keluar {formatRatio(data.ratio)} lebih tinggi</p>
      )}
      {data.r_absence !== null && (
        <p className="tabular mt-1 text-small text-muted">Korelasi point-biserial r = {formatCorrelation(data.r_absence)}</p>
      )}
    </div>
  );
}
