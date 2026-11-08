import { getEnv } from "@/lib/env";
import { NavLinks } from "./nav-links";

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex h-9 items-end gap-1">
        <span className="h-4 w-2 rounded-pill bg-primary/50" />
        <span className="h-6 w-2 rounded-pill bg-primary/75" />
        <span className="h-9 w-2 rounded-pill bg-primary" />
      </span>
      <span className="flex flex-col">
        <span className="text-brand">HR Analytics</span>
        <span className="text-small text-muted">Site Tambang</span>
      </span>
    </div>
  );
}

export function AuthorCard() {
  const repo = getEnv().NEXT_PUBLIC_REPO_URL;
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-small text-muted">Proyek portofolio</p>
      <p className="text-body-sm font-bold">Athayya Ari Rafeyfa Sajjida</p>
      <p className="mt-1 text-small text-muted">Semua angka berasal dari data dummy.</p>
      {repo && (
        <a href={repo} className="mt-2 inline-flex min-h-touch items-center text-small font-semibold text-primary underline underline-offset-4">
          Lihat kode
        </a>
      )}
    </div>
  );
}

/** Desktop sidebar: sits on the page background, not sticky (DESIGN.md §4.1). */
export function Sidebar() {
  return (
    <aside className="print-hidden hidden w-sidebar shrink-0 flex-col gap-8 py-2 md:flex">
      <BrandMark />
      <nav aria-label="Navigasi utama">
        <NavLinks />
      </nav>
      <div className="mt-auto">
        <AuthorCard />
      </div>
    </aside>
  );
}
