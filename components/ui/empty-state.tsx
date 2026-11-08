import Link from "next/link";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
      <Inbox aria-hidden size={24} strokeWidth={1.75} className="mb-1 text-muted" />
      <h3 className="text-h3">{title}</h3>
      {description && <p className="text-body-sm text-muted">{description}</p>}
      {href && linkLabel && (
        <Link
          href={href}
          className="inline-flex min-h-touch items-center text-body-sm font-semibold text-primary underline underline-offset-4"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
