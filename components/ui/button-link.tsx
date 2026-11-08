import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Secondary pill button rendered as a link (downloads). */
export function ButtonLink({
  href,
  children,
  download,
  className,
}: {
  href: string;
  children: ReactNode;
  download?: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      {...(download ? { download: "" } : {})}
      className={cn(
        "inline-flex min-h-touch items-center gap-2 rounded-pill border border-border bg-surface px-4 text-body-sm font-semibold text-text hover:bg-soft",
        className,
      )}
    >
      {children}
    </a>
  );
}
