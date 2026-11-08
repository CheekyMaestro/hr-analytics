import { cn } from "@/lib/cn";

/** Placeholder with the block's shape; appears after 300 ms, no pulse with reduced motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-skeleton rounded-sm bg-surface-muted opacity-0", className)} />;
}

export function CardSkeleton({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("rounded-card bg-surface p-5 shadow-card", className)} aria-busy="true" aria-label="Memuat">
      <Skeleton className="mb-4 h-6 w-1/2" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="mb-3 h-4 w-full last:mb-0" />
      ))}
    </div>
  );
}
