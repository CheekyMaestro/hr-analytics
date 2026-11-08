/** Department risk level (PRD.md §8.4). */
export type RiskLevel = "tinggi" | "sedang" | "rendah";

export const RISK_LABEL: Record<RiskLevel, string> = {
  tinggi: "Tinggi",
  sedang: "Sedang",
  rendah: "Rendah",
};

export type RiskInput = { turnoverPct: number; absenteeismPct: number };

/**
 * Tinggi: turnover ≥ 1.5× site, or (turnover ≥ 1.2× site and absenteeism ≥ 1.2× site).
 * Sedang: turnover ≥ 0.85× site. Rendah: otherwise. All values are period averages.
 */
export function riskLevel(dept: RiskInput, site: RiskInput): RiskLevel {
  const t = dept.turnoverPct;
  const a = dept.absenteeismPct;
  if (t >= 1.5 * site.turnoverPct || (t >= 1.2 * site.turnoverPct && a >= 1.2 * site.absenteeismPct)) {
    return "tinggi";
  }
  if (t >= 0.85 * site.turnoverPct) return "sedang";
  return "rendah";
}
