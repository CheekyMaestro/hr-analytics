import Link from "next/link";
import { Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Full-width message inside the shell (DESIGN.md §5). */
export function Banner({
  tone,
  children,
  href,
  linkLabel,
}: {
  tone: "info" | "warning";
  children: ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  const Icon = tone === "warning" ? TriangleAlert : Info;
  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-md px-4 py-2 text-body-sm font-semibold",
        tone === "warning" ? "bg-warning/(--tint) text-warning" : "bg-info/(--tint) text-info",
      )}
    >
      <Icon aria-hidden size={20} strokeWidth={1.75} className="shrink-0" />
      <p className="min-w-0 flex-1 text-text">{children}</p>
      {href && linkLabel && (
        <Link href={href} className="inline-flex min-h-touch items-center underline underline-offset-4">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
