/**
 * Chart colours as CSS variable references (DESIGN.md §3.3). Recharts receives
 * `var(--chart-n)`, so the active theme (light/dark) applies without re-rendering.
 * Never pass hex literals to charts (RULES.md §7.1).
 */
export const CHART = {
  series1: "var(--chart-1)",
  series2: "var(--series-2)",
  grid: "var(--grid)",
  axis: "var(--text-muted)",
  surface: "var(--surface)",
  text: "var(--text)",
} as const;

/** Categorical palette in department sort order: Hauling, Mining Ops, Plant & Maint, HSE, HR & GA, Finance. */
export const CATEGORICAL = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

export const DEPARTMENT_COLOR: Record<string, string> = {
  hauling: CATEGORICAL[0],
  mining_ops: CATEGORICAL[1],
  plant_maint: CATEGORICAL[2],
  hse: CATEGORICAL[3],
  hr_ga: CATEGORICAL[4],
  finance: CATEGORICAL[5],
};

/** Second line pattern so the two series differ by more than colour. */
export const DASH_PATTERN = "7 6";
