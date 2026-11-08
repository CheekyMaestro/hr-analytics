"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, Download, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import { cn } from "@/lib/cn";

const item =
  "flex min-h-touch items-center gap-3 rounded-pill px-4 text-body-sm font-semibold text-text hover:bg-surface";
const active = "bg-primary text-primary-foreground hover:bg-primary";

const EXPORT_PATH = "/api/v1/export/monthly.csv";

function DownloadLink({ onNavigate }: { onNavigate?: () => void }) {
  const params = useSearchParams();
  const keep = new URLSearchParams();
  for (const key of ["from", "to", "dept"]) {
    const v = params.get(key);
    if (v) keep.set(key, v);
  }
  const qs = keep.toString();
  return (
    <a href={qs ? `${EXPORT_PATH}?${qs}` : EXPORT_PATH} download="" className={item} {...(onNavigate ? { onClick: onNavigate } : {})}>
      <Download aria-hidden size={20} strokeWidth={1.75} />
      Unduh data bersih
    </a>
  );
}

/** Sidebar navigation (DESIGN.md §4.2). The CSV link keeps the current filter. */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Dashboard", Icon: LayoutDashboard, current: pathname === "/" },
    { href: "/data-quality", label: "Data Quality Log", Icon: ShieldCheck, current: pathname === "/data-quality" },
    { href: "/data-quality#definisi", label: "Definisi KPI", Icon: BookOpen, current: false },
  ];
  return (
    <ul className="flex flex-col gap-1">
      {links.map(({ href, label, Icon, current }) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={current ? "page" : undefined}
            className={cn(item, current && active)}
            {...(onNavigate ? { onClick: onNavigate } : {})}
          >
            <Icon aria-hidden size={20} strokeWidth={1.75} />
            {label}
          </Link>
        </li>
      ))}
      <li>
        <Suspense
          fallback={
            <a href={EXPORT_PATH} download="" className={item}>
              <Download aria-hidden size={20} strokeWidth={1.75} />
              Unduh data bersih
            </a>
          }
        >
          <DownloadLink {...(onNavigate ? { onNavigate } : {})} />
        </Suspense>
      </li>
    </ul>
  );
}
