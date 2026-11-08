import { z } from "zod";

/** Department codes (SCHEMA.md §4.1). */
export const DEPARTMENT_CODES = ["hauling", "mining_ops", "plant_maint", "hse", "hr_ga", "finance"] as const;
export type DepartmentCode = (typeof DEPARTMENT_CODES)[number];

export type Filters = {
  /** First month, `YYYY-MM`. */
  from: string;
  /** Last month, `YYYY-MM`, ≥ from. */
  to: string;
  /** Department code, or null for all departments. */
  dept: DepartmentCode | null;
};

/** First and last month available in the data (`YYYY-MM`). */
export type DataRange = { first: string; last: string };

export type FilterIssue = {
  field: "from" | "to" | "dept";
  issue: "invalid_format" | "out_of_range" | "after_to" | "unknown_department" | "repeated";
};

export type ParseResult = { ok: true; filters: Filters } | { ok: false; details: FilterIssue[] };

const ym = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const dept = z.enum(DEPARTMENT_CODES);

type Input = URLSearchParams | Record<string, string | string[] | undefined>;

function read(input: Input, key: string): { value?: string; repeated: boolean } {
  if (input instanceof URLSearchParams) {
    const all = input.getAll(key);
    return all.length > 1 ? { repeated: true } : all[0] === undefined ? { repeated: false } : { value: all[0], repeated: false };
  }
  const v = input[key];
  if (Array.isArray(v)) return v.length > 1 ? { repeated: true } : v[0] === undefined ? { repeated: false } : { value: v[0], repeated: false };
  return v === undefined ? { repeated: false } : { value: v, repeated: false };
}

/**
 * Parse `?from=YYYY-MM&to=YYYY-MM&dept=<code>` (ARCHITECTURE.md §6).
 * Missing values default to the data range / all departments; invalid values are
 * reported, never silently replaced (RULES.md §5).
 */
export function parseFilters(input: Input, range: DataRange): ParseResult {
  const details: FilterIssue[] = [];
  const out: Filters = { from: range.first, to: range.last, dept: null };

  for (const field of ["from", "to"] as const) {
    const { value, repeated } = read(input, field);
    if (repeated) details.push({ field, issue: "repeated" });
    else if (value !== undefined && value !== "") {
      if (!ym.safeParse(value).success) details.push({ field, issue: "invalid_format" });
      else if (value < range.first || value > range.last) details.push({ field, issue: "out_of_range" });
      else out[field] = value;
    }
  }
  if (!details.some((d) => d.field === "from" || d.field === "to") && out.from > out.to) {
    details.push({ field: "from", issue: "after_to" });
  }

  const d = read(input, "dept");
  if (d.repeated) details.push({ field: "dept", issue: "repeated" });
  else if (d.value !== undefined && d.value !== "") {
    const parsed = dept.safeParse(d.value);
    if (!parsed.success) details.push({ field: "dept", issue: "unknown_department" });
    else out.dept = parsed.data;
  }

  return details.length ? { ok: false, details } : { ok: true, filters: out };
}

/** Query string for a filter, leaving out defaults (`""` for the default view). */
export function filtersToQuery(f: Filters, range: DataRange): string {
  const p = new URLSearchParams();
  if (f.from !== range.first || f.to !== range.last) {
    p.set("from", f.from);
    p.set("to", f.to);
  }
  if (f.dept) p.set("dept", f.dept);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** `2025-03` → `2025-03-01` (SQL date). */
export function monthStart(ymValue: string): string {
  return `${ymValue}-01`;
}

/** Months between two `YYYY-MM` values, inclusive. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/** Whether the filter covers the full data range for all departments. */
export function isDefaultFilter(f: Filters, range: DataRange): boolean {
  return f.from === range.first && f.to === range.last && f.dept === null;
}
