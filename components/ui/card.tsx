import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = {
  title?: ReactNode;
  caption?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
  id?: string;
};

/** White rounded card inside the shell (DESIGN.md §5). */
export function Card({ title, caption, action, children, className, as: Tag = "section", id }: CardProps) {
  return (
    <Tag id={id} className={cn("print-card min-w-0 rounded-card bg-surface p-5 shadow-card", className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-h2">{title}</h2>}
            {caption && <p className="mt-0.5 text-small text-muted">{caption}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </Tag>
  );
}
