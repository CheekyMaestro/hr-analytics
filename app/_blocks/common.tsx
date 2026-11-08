import { Suspense, type ReactNode } from "react";
import { Banner } from "@/components/ui/banner";
import { BlockError } from "@/components/ui/block-error";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import { formatInt, formatTimestampWib } from "@/lib/domain/format";
import type { PageContext } from "@/lib/page-context";

/** Suspense + block-level error boundary around one data block. */
export function Block({ children, fallback, className }: { children: ReactNode; fallback?: ReactNode; className?: string }) {
  return (
    <BlockError>
      <Suspense fallback={fallback ?? <CardSkeleton {...(className ? { className } : {})} />}>{children}</Suspense>
    </BlockError>
  );
}

/** Empty states for a block when the page has no data or an invalid filter (DESIGN.md §6.3). */
export function BlockState({ ctx, title, className }: { ctx: Exclude<PageContext, { status: "ok" }>; title: string; className?: string }) {
  return (
    <Card title={title} {...(className ? { className } : {})}>
      {ctx.status === "no-data" ? (
        <EmptyState title="Belum ada data" description="Jalankan pipeline untuk mengisi dashboard." />
      ) : (
        <EmptyState title="Tidak ada data untuk filter ini." href="?" linkLabel="Hapus filter" />
      )}
    </Card>
  );
}

/** Page-level banners: no data, invalid filter, failed checks. */
export async function PageBanner({ ctx }: { ctx: Promise<PageContext> }) {
  const c = await ctx;
  if (c.status === "no-data") return <Banner tone="info">Belum ada data. Jalankan pipeline untuk mengisi dashboard.</Banner>;
  const failed = c.meta.failed_checks > 0;
  return (
    <>
      {c.status === "invalid" && (
        <Banner tone="warning" href="?" linkLabel="Hapus filter">
          Filter di alamat halaman tidak valid.
        </Banner>
      )}
      {failed && (
        <Banner tone="warning" href="/data-quality" linkLabel="Lihat Data Quality Log">
          Ada pemeriksaan data yang gagal.
        </Banner>
      )}
    </>
  );
}

/** Footer with the "Data dummy" note on every page (FR-42). */
export async function SiteFooter({ ctx }: { ctx: Promise<PageContext> }) {
  const c = await ctx;
  if (c.status === "no-data") {
    return <p className="mt-4 text-small text-muted">Data dummy untuk portofolio · Belum ada pipeline yang berjalan</p>;
  }
  const s = c.meta.sources;
  return (
    <p className="mt-4 text-small text-muted">
      Data dummy untuk portofolio · Sumber: E_site_employees ({formatInt(s.employee_rows)} baris) dan E_site_monthly (
      {formatInt(s.monthly_clean_rows)} baris bersih dari {formatInt(s.monthly_raw_rows)}) · Pipeline terakhir{" "}
      {formatTimestampWib(c.meta.latest_run.finished_at)}
    </p>
  );
}
