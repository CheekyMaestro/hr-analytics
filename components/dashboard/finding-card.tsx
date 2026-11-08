import type { Finding } from "@/lib/queries/types";

export function FindingCard({ finding }: { finding: Finding }) {
  return (
    <article className="print-card flex h-full flex-col rounded-card bg-surface p-5 shadow-card">
      <p className="text-small font-extrabold tracking-wide text-primary uppercase">Temuan {String(finding.no).padStart(2, "0")}</p>
      <h3 className="mt-1 text-h3">{finding.title}</h3>
      <p className="mt-2 flex-1 text-body-sm text-muted">{finding.body}</p>
      <div className="mt-4 rounded-md bg-soft p-3">
        <p className="text-small font-bold">Rekomendasi</p>
        <p className="text-body-sm">{finding.recommendation}</p>
      </div>
    </article>
  );
}
