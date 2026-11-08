import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button-link";
import { SrTable } from "@/components/ui/sr-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { RiskList } from "@/components/dashboard/risk-list";
import { OvertimeLeave } from "@/components/dashboard/overtime-leave";
import { AbsenceLeave } from "@/components/dashboard/absence-leave";
import { CostBreakdown } from "@/components/dashboard/cost-breakdown";
import { FindingCard } from "@/components/dashboard/finding-card";
import { DepartmentTable } from "@/components/dashboard/department-table";
import { FilterBar } from "@/components/shell/filter-bar";
import { Download } from "lucide-react";
import {
  formatAbsenteeism,
  formatHours,
  formatInt,
  formatMonth,
  formatMonthLong,
  formatMonthShort,
  formatPercent,
  formatPeriod,
  formatRupiahShort,
  formatTurnover,
} from "@/lib/domain/format";
import { filtersToQuery, type Filters } from "@/lib/domain/filters";
import type { PageContext } from "@/lib/page-context";
import { getAbsenceLeave, getDepartments, getFindings, getMonthly, getOvertimeLeave, getSummary } from "@/lib/queries/dashboard";
import { BlockState } from "./common";

type P = { ctx: Promise<PageContext> };

const periodLabel = (f: Filters) => formatPeriod(f.from, f.to);
const yearOrPeriod = (f: Filters) => (f.from.endsWith("-01") && f.to.endsWith("-12") && f.from.slice(0, 4) === f.to.slice(0, 4) ? f.from.slice(0, 4) : periodLabel(f));

export async function PeriodDescription({ ctx }: P) {
  const c = await ctx;
  return <>Absensi, lembur, dan turnover{c.status === "ok" ? ` · ${periodLabel(c.filters)}` : ""}</>;
}

export async function DashboardFilters({ ctx }: P) {
  const c = await ctx;
  if (c.status === "no-data") return null;
  const filters = c.status === "ok" ? c.filters : { from: c.range.first, to: c.range.last, dept: null };
  return <FilterBar months={c.meta.months} departments={c.meta.departments} filters={filters} />;
}

export async function KpiCards({ ctx }: P) {
  const c = await ctx;
  if (c.status !== "ok") return <BlockState ctx={c} title="Ringkasan" />;
  const s = await getSummary(c.filters);
  if (!s) return <BlockState ctx={{ status: "no-data" }} title="Ringkasan" />;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Headcount akhir"
        value={formatInt(s.headcount_end)}
        note={`${formatInt(s.leavers)} keluar sejak ${formatMonthLong(c.filters.from).split(" ")[0]} (${formatInt(s.headcount_start)})`}
      />
      <KpiCard
        title="Turnover bulanan"
        value={formatTurnover(s.turnover_monthly_avg_pct)}
        note={`Rata-rata · tahunan ${formatPercent(s.turnover_annual_pct, 1)}`}
        danger
      />
      <KpiCard title="Absenteeism rate" value={formatAbsenteeism(s.absenteeism_pct)} note="Hari absen ÷ hari kerja terjadwal" />
      <KpiCard
        title={`Biaya lembur ${yearOrPeriod(c.filters)}`}
        value={formatRupiahShort(s.overtime_cost_idr)}
        note={`Rata-rata ${formatHours(s.overtime_hours_per_employee_month)}/orang/bulan`}
      />
    </div>
  );
}

export async function TrendBlock({ ctx }: P) {
  const title = "Turnover vs absensi per bulan";
  const c = await ctx;
  if (c.status !== "ok") return <BlockState ctx={c} title={title} className="lg:col-span-2" />;
  const months = (await getMonthly(c.filters)) ?? [];
  const data = months.map((m) => ({ month: m.month, label: formatMonthShort(m.month), turnover: m.turnover_pct, absenteeism: m.absenteeism_pct }));
  const peak = months.reduce<(typeof months)[number] | null>((a, m) => (!a || m.turnover_pct > a.turnover_pct ? m : a), null);
  const legend = (
    <div aria-hidden className="flex flex-wrap gap-4 text-small text-muted">
      <span className="flex items-center gap-2">
        <span className="h-[3px] w-6 rounded-pill bg-chart-1" /> Turnover
      </span>
      <span className="flex items-center gap-2">
        <span className="w-6 border-t-[3px] border-dashed border-series-2" /> Absensi
      </span>
    </div>
  );
  return (
    <Card title={title} action={legend} className="flex flex-col lg:col-span-2">
      {data.length === 0 ? (
        <EmptyState title="Tidak ada data untuk filter ini." href="?" linkLabel="Hapus filter" />
      ) : (
        <>
          <div
            className="min-h-64 flex-1"
            role="img"
            aria-label={`Turnover bulanan dan absensi per bulan, ${periodLabel(c.filters)}. Turnover tertinggi ${peak ? `${formatMonth(peak.month)} ${formatTurnover(peak.turnover_pct)}` : ""}.`}
          >
            <TrendChart data={data} />
          </div>
          <SrTable
            caption="Turnover dan absensi per bulan"
            head={["Bulan", "Headcount", "Keluar", "Turnover", "Absensi"]}
            rows={months.map((m) => [formatMonth(m.month), formatInt(m.headcount), formatInt(m.leavers), formatTurnover(m.turnover_pct), formatAbsenteeism(m.absenteeism_pct)])}
          />
        </>
      )}
    </Card>
  );
}

export async function RiskBlock({ ctx }: P) {
  const title = "Risiko per departemen";
  const c = await ctx;
  if (c.status !== "ok") return <BlockState ctx={c} title={title} />;
  const rows = (await getDepartments(c.filters)) ?? [];
  return (
    <Card title={title} caption="Diurutkan dari turnover bulanan tertinggi">
      <RiskList rows={rows} selected={c.filters.dept} />
    </Card>
  );
}

export async function OvertimeBlock({ ctx }: P) {
  const title = "Lembur vs keluar";
  const c = await ctx;
  if (c.status !== "ok") return <BlockState ctx={c} title={title} />;
  const data = await getOvertimeLeave(c.filters);
  return (
    <Card title={title} caption="Tingkat keluar per bulan menurut rata-rata lembur 3 bulan">
      {data ? <OvertimeLeave data={data} /> : <EmptyState title="Tidak ada data untuk filter ini." />}
    </Card>
  );
}

export async function AbsenceBlock({ ctx }: P) {
  const title = "Absen sebelum keluar";
  const c = await ctx;
  if (c.status !== "ok") return <BlockState ctx={c} title={title} />;
  const data = await getAbsenceLeave(c.filters);
  return (
    <Card title={title} caption="Absensi karyawan yang keluar vs yang bertahan">
      {data ? <AbsenceLeave data={data} /> : <EmptyState title="Tidak ada data untuk filter ini." />}
    </Card>
  );
}

export async function CostBlock({ ctx }: P) {
  const title = "Biaya lembur per departemen";
  const c = await ctx;
  if (c.status !== "ok") return <BlockState ctx={c} title={title} />;
  const rows = (await getDepartments(c.filters)) ?? [];
  return (
    <Card title={title}>
      <CostBreakdown rows={rows} totalLabel={`total ${yearOrPeriod(c.filters)}`} selected={c.filters.dept} />
    </Card>
  );
}

export async function FindingsBlock({ ctx }: P) {
  const c = await ctx;
  if (c.status !== "ok") return <BlockState ctx={c} title="Temuan & rekomendasi" />;
  const findings = (await getFindings(c.filters)) ?? [];
  return (
    <section aria-labelledby="temuan">
      <h2 id="temuan" className="mb-3 px-1 text-h2">
        {findings.length} temuan & rekomendasi
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {findings.map((f) => (
          <FindingCard key={f.no} finding={f} />
        ))}
      </div>
      <p className="mt-3 px-1 text-small text-muted">
        Hubungan di atas adalah korelasi, bukan sebab-akibat. Lihat batasan data di halaman{" "}
        <a href="/data-quality#batasan" className="font-semibold text-text underline underline-offset-4">
          Data Quality Log
        </a>
        .
      </p>
    </section>
  );
}

export async function DepartmentTableBlock({ ctx }: P) {
  const title = "Detail per departemen";
  const c = await ctx;
  if (c.status !== "ok") return <BlockState ctx={c} title={title} />;
  const [rows, site] = await Promise.all([getDepartments(c.filters), getSummary({ ...c.filters, dept: null })]);
  if (!rows || !site) return <BlockState ctx={{ status: "no-data" }} title={title} />;
  const action = (
    <ButtonLink href={`/api/v1/export/departments.csv${filtersToQuery(c.filters, c.range)}`} download>
      <Download aria-hidden size={16} strokeWidth={1.75} /> Unduh CSV
    </ButtonLink>
  );
  return (
    <Card title={title} action={action}>
      <DepartmentTable rows={rows} site={site} selected={c.filters.dept} />
    </Card>
  );
}
