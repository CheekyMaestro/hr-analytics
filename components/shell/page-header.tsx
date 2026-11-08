import type { ReactNode } from "react";

/** Title + one-line description left; filters, actions and theme toggle right (wraps below 1024 px). */
export function PageHeader({ title, description, actions }: { title: string; description: ReactNode; actions: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-h1">{title}</h1>
        <p className="mt-1 text-body text-muted">{description}</p>
      </div>
      <div className="flex w-full flex-wrap items-end gap-3 lg:w-auto">{actions}</div>
    </header>
  );
}

/** The large tinted rounded panel that holds all cards. */
export function ContentShell({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-5 rounded-shell bg-shell p-3 md:p-5">{children}</div>;
}
