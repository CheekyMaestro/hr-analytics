import { describe, expect, it } from "vitest";
import {
  formatAbsenteeism,
  formatHours,
  formatInt,
  formatMonth,
  formatMonthShort,
  formatPeriod,
  formatRatio,
  formatRupiah,
  formatRupiahShort,
  formatTimestampWib,
  formatTurnover,
} from "@/lib/domain/format";

describe("format (id-ID)", () => {
  it("formats integers with dot separators", () => {
    expect(formatInt(4514)).toBe("4.514");
    expect(formatInt(400)).toBe("400");
  });
  it("formats turnover with 2 decimals and absenteeism with 1", () => {
    expect(formatTurnover(1.3928)).toBe("1,39%");
    expect(formatTurnover(0.75)).toBe("0,75%");
    expect(formatAbsenteeism(3.233)).toBe("3,2%");
    expect(formatAbsenteeism(2.9)).toBe("2,9%");
  });
  it("formats money", () => {
    expect(formatRupiahShort(6_350_000_000)).toBe("Rp 6,35 M");
    expect(formatRupiahShort(390_000_000)).toBe("Rp 0,39 M");
    expect(formatRupiah(2_410_512_000)).toBe("Rp 2.410.512.000");
  });
  it("formats hours and ratios", () => {
    expect(formatHours(29.77)).toBe("30 jam");
    expect(formatRatio(2.863)).toBe("2,9×");
  });
  it("formats months and periods", () => {
    expect(formatMonthShort("2025-08")).toBe("Agu");
    expect(formatMonth("2025-05")).toBe("Mei 2025");
    expect(formatPeriod("2025-01", "2025-12")).toBe("Jan–Des 2025");
    expect(formatPeriod("2025-07", "2025-07")).toBe("Jul 2025");
    expect(formatPeriod("2024-11", "2025-02")).toBe("Nov 2024–Feb 2025");
  });
  it("formats timestamps in WIB", () => {
    expect(formatTimestampWib("2026-11-08T09:50:00Z")).toBe("8 Nov 2026, 16.50 WIB");
    expect(formatTimestampWib("2025-12-31T18:05:00Z")).toBe("1 Jan 2026, 01.05 WIB");
  });
});
