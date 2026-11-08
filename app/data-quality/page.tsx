import type { Metadata } from "next";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { ContentShell, PageHeader } from "@/components/shell/page-header";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiDefinitionCard } from "@/components/data-quality/dq-components";
import { KPI_DEFINITIONS } from "@/content/kpi-definitions";
import { resolveFullRange } from "@/lib/page-context";
import { Block, PageBanner, SiteFooter } from "../_blocks/common";
import { Aliases, DqSummaryCards, IssueLog, Limitations, OvertimeNullBlock, RunDescription } from "../_blocks/data-quality";

export const metadata: Metadata = { title: "Data Quality Log" };

/** `/data-quality` — Data Quality Log, #definisi, #batasan (PRD UC-06, UC-07, FR-20 … FR-25). */
export default function DataQualityPage() {
  const ctx = resolveFullRange();
  return (
    <>
      <PageHeader
        title="Data Quality Log"
        description={
          <Suspense fallback="Pembersihan E_site_employees dan E_site_monthly">
            <RunDescription />
          </Suspense>
        }
        actions={
          <>
            <ButtonLink href="/api/v1/export/dq-log.csv" download className="print-hidden">
              <Download aria-hidden size={16} strokeWidth={1.75} /> Unduh log (CSV)
            </ButtonLink>
            <ThemeToggle />
          </>
        }
      />
      <ContentShell>
        <Suspense fallback={null}>
          <PageBanner ctx={ctx} />
        </Suspense>
        <Block
          fallback={
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-card bg-surface p-5 shadow-card">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="mt-4 h-8 w-2/3" />
                </div>
              ))}
            </div>
          }
        >
          <DqSummaryCards />
        </Block>
        <Block className="h-96">
          <IssueLog />
        </Block>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Block className="h-96">
            <Aliases />
          </Block>
          <Block className="h-96">
            <OvertimeNullBlock />
          </Block>
        </div>
        <section id="definisi" aria-labelledby="definisi-title" className="scroll-mt-6">
          <h2 id="definisi-title" className="mb-3 px-1 text-h2">
            Definisi KPI
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {KPI_DEFINITIONS.map((d) => (
              <KpiDefinitionCard key={d.id} def={d} />
            ))}
          </div>
        </section>
        <Card id="batasan" title="Batasan data" className="scroll-mt-6">
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <Limitations />
          </Suspense>
        </Card>
      </ContentShell>
      <Suspense fallback={null}>
        <SiteFooter ctx={ctx} />
      </Suspense>
    </>
  );
}
