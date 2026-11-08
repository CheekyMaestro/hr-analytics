/**
 * Number and date formatting (DESIGN.md §7, RULES.md §7.3). Every figure in the
 * UI goes through these functions; they wrap Intl.NumberFormat('id-ID').
 */

const LOCALE = "id-ID";
const TIME_ZONE = "Asia/Jakarta";

const nf = (min: number, max = min) =>
  new Intl.NumberFormat(LOCALE, { minimumFractionDigits: min, maximumFractionDigits: max });

const INT = nf(0);
const DEC1 = nf(1);
const DEC2 = nf(2);

export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"] as const;
export const MONTH_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

/** 4514 → "4.514" */
export function formatInt(v: number): string {
  return INT.format(Math.round(v));
}

/** Plain decimal with fixed digits: (2.863, 1) → "2,9" */
export function formatDecimal(v: number, digits: number): string {
  return nf(digits).format(v);
}

/** Percent with fixed decimals: (1.3928, 2) → "1,39%" */
export function formatPercent(v: number, digits: 1 | 2): string {
  return `${(digits === 1 ? DEC1 : DEC2).format(v)}%`;
}

/** Turnover (2 decimals): "1,39%" */
export const formatTurnover = (v: number) => formatPercent(v, 2);
/** Absenteeism (1 decimal): "3,2%" */
export const formatAbsenteeism = (v: number) => formatPercent(v, 1);

/** Miliar rupiah, 2 decimals: 6_350_000_000 → "Rp 6,35 M" */
export function formatRupiahShort(idr: number): string {
  return `Rp ${DEC2.format(idr / 1_000_000_000)} M`;
}

/** Full rupiah: 2_410_512_000 → "Rp 2.410.512.000" */
export function formatRupiah(idr: number): string {
  return `Rp ${INT.format(Math.round(idr))}`;
}

/** Hours, whole: 29.77 → "30 jam" */
export function formatHours(v: number): string {
  return `${INT.format(Math.round(v))} jam`;
}

/** Ratio, 1 decimal: 2.863 → "2,9×" */
export function formatRatio(v: number): string {
  return `${DEC1.format(v)}×`;
}

/** Correlation coefficient, 2 decimals with sign: 0.084 → "0,08" */
export function formatCorrelation(v: number): string {
  return DEC2.format(v);
}

function parseYm(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-");
  return { year: Number(y), month: Number(m) };
}

/** "2025-03" → "Mar" */
export function formatMonthShort(ym: string): string {
  return MONTH_SHORT[parseYm(ym).month - 1] ?? ym;
}

/** "2025-03" → "Mar 2025" */
export function formatMonth(ym: string): string {
  const { year, month } = parseYm(ym);
  return `${MONTH_SHORT[month - 1] ?? "?"} ${year}`;
}

/** "2025-03" → "Maret 2025" */
export function formatMonthLong(ym: string): string {
  const { year, month } = parseYm(ym);
  return `${MONTH_LONG[month - 1] ?? "?"} ${year}`;
}

/** ("2025-01", "2025-12") → "Jan–Des 2025"; across years → "Nov 2024–Feb 2025"; one month → "Mar 2025". */
export function formatPeriod(from: string, to: string): string {
  if (from === to) return formatMonth(from);
  const a = parseYm(from);
  const b = parseYm(to);
  if (a.year === b.year) return `${MONTH_SHORT[a.month - 1]}–${MONTH_SHORT[b.month - 1]} ${a.year}`;
  return `${formatMonth(from)}–${formatMonth(to)}`;
}

/** ISO timestamp → "8 Nov 2026, 16.50 WIB" (Asia/Jakarta). */
export function formatTimestampWib(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  const month = MONTH_SHORT[Number(get("month")) - 1] ?? "";
  return `${Number(get("day"))} ${month} ${get("year")}, ${get("hour")}.${get("minute")} WIB`;
}
