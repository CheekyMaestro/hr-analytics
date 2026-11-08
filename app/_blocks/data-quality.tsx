import { connection } from "next/server";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AliasList, DqStatCard, IssueTable, OvertimeNullPanel } from "@/components/data-quality/dq-components";
import { LIMITATIONS } from "@/content/limitations";
import { renderTemplate } from "@/lib/domain/findings";
import { formatInt, formatPeriod, formatTimestampWib } from "@/lib/domain/format";
import { resolveFullRange } from "@/lib/page-context";
import { getDqAliases, getDqIssues, getDqSummary, getOvertimeNull } from "@/lib/queries/data-quality";

const noData = (title: string) => (
  <Card title={title}>
    <EmptyState title="Belum ada data" description="Jalankan pipeline untuk mengisi log." />
  </Card>
);

export async function RunDescription() {
  await connection();
  const s = await getDqSummary();
  return <>Pembersihan E_site_employees dan E_site_monthly{s ? ` · run terakhir ${formatTimestampWib(s.finished_at)}` : ""}</>;
}

export async function DqSummaryCards() {
  await connection();
  const s = await getDqSummary();
  if (!s) return noData("Ringkasan");
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <DqStatCard title="Baris mentah" value={formatInt(s.raw_rows)} note="E_site_monthly" />
      <DqStatCard title="Duplikat dihapus" value={formatInt(s.duplicate_rows)} note="Baris identik" />
      <DqStatCard title="Baris bersih" value={formatInt(s.clean_rows)} note="Dipakai semua KPI" />
      <DqStatCard
        title="Departemen"
        value={`${formatInt(s.department_spellings)} → ${formatInt(s.department_canonical)}`}
        note="Ejaan → nama baku"
      />
      <DqStatCard title="Lembur kosong" value={formatInt(s.overtime_null_rows)} note="Diisi 0, ditandai" />
    </div>
  );
}

export async function IssueLog() {
  await connection();
  const issues = await getDqIssues();
  if (!issues) return noData("Log masalah data");
  return (
    <Card title="Log masalah data" caption="Satu baris per pemeriksaan pada run terakhir">
      <IssueTable issues={issues} />
    </Card>
  );
}

export async function Aliases() {
  await connection();
  const aliases = await getDqAliases();
  if (!aliases) return noData("Penyeragaman nama departemen");
  return (
    <Card title="Penyeragaman nama departemen" caption="Ejaan mentah → nama baku, jumlah baris di E_site_monthly">
      <AliasList aliases={aliases} />
    </Card>
  );
}

export async function OvertimeNullBlock() {
  await connection();
  const ctx = await resolveFullRange();
  if (ctx.status !== "ok") return noData("Penanganan lembur kosong");
  const data = await getOvertimeNull(ctx.filters);
  if (!data) return noData("Penanganan lembur kosong");
  return (
    <Card title="Penanganan lembur kosong">
      <OvertimeNullPanel data={data} />
    </Card>
  );
}

export async function Limitations() {
  await connection();
  const [ctx, s] = await Promise.all([resolveFullRange(), getDqSummary()]);
  const values =
    ctx.status === "ok" && s
      ? {
          months: formatInt(ctx.meta.months.length),
          period: formatPeriod(ctx.range.first, ctx.range.last),
          null_rows: formatInt(s.overtime_null_rows),
        }
      : { months: "–", period: "–", null_rows: "–" };
  return (
    <ol className="flex list-decimal flex-col gap-2 pl-5 text-body-sm marker:font-bold marker:text-primary">
      {LIMITATIONS.map((l) => (
        <li key={l}>{renderTemplate(l, values)}</li>
      ))}
    </ol>
  );
}
