import { Suspense } from "react";
import { ContentShell, PageHeader } from "@/components/shell/page-header";
import { FilterBarSkeleton } from "@/components/shell/filter-bar";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { resolvePage } from "@/lib/page-context";
import { Block, PageBanner, SiteFooter } from "./_blocks/common";
import {
  AbsenceBlock,
  CostBlock,
  DashboardFilters,
  DepartmentTableBlock,
  FindingsBlock,
  KpiCards,
  OvertimeBlock,
  PeriodDescription,
  RiskBlock,
  TrendBlock,
} from "./_blocks/dashboard";

/** `/` — Dashboard (PRD UC-01 … UC-05, FR-10 … FR-19). */
export default function DashboardPage({ searchParams }: PageProps<"/">) {
  const ctx = resolvePage(searchParams);
  return (
    <>
      <PageHeader
        title="Ringkasan HR Site"
        description={
          <Suspense fallback="Absensi, lembur, dan turnover">
            <PeriodDescription ctx={ctx} />
          </Suspense>
        }
        actions={
          <>
            <Suspense fallback={<FilterBarSkeleton />}>
              <DashboardFilters ctx={ctx} />
            </Suspense>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-card bg-surface p-5 shadow-card">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="mt-4 h-9 w-2/3" />
                  <Skeleton className="mt-3 h-4 w-3/4" />
                </div>
              ))}
            </div>
          }
        >
          <KpiCards ctx={ctx} />
        </Block>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Block className="h-80 lg:col-span-2">
            <TrendBlock ctx={ctx} />
          </Block>
          <Block className="h-80">
            <RiskBlock ctx={ctx} />
          </Block>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Block className="h-72">
            <OvertimeBlock ctx={ctx} />
          </Block>
          <Block className="h-72">
            <AbsenceBlock ctx={ctx} />
          </Block>
          <Block className="h-72">
            <CostBlock ctx={ctx} />
          </Block>
        </div>
        <Block className="h-56">
          <FindingsBlock ctx={ctx} />
        </Block>
        <Block className="h-80">
          <DepartmentTableBlock ctx={ctx} />
        </Block>
      </ContentShell>
      <Suspense fallback={null}>
        <SiteFooter ctx={ctx} />
      </Suspense>
    </>
  );
}
