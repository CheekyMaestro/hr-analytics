import { describe, expect, it } from "vitest";
import {
  absenteeismPct,
  leaveRatePct,
  overtimeBucket,
  overtimeCostIdr,
  ratio,
  turnoverAnnualPct,
  turnoverMonthlyAvgPct,
  turnoverPct,
} from "@/lib/domain/kpi";
import { riskLevel } from "@/lib/domain/risk";

describe("KPI formulas (PRD §8.2)", () => {
  it("turnover bulanan and its period aggregates", () => {
    expect(turnoverPct(3, 400)).toBeCloseTo(0.75);
    const months = [
      { leavers: 3, headcount: 400 },
      { leavers: 4, headcount: 397 },
    ];
    expect(turnoverMonthlyAvgPct(months)).toBeCloseTo((0.75 + 400 / 397) / 2);
    expect(turnoverAnnualPct(months)).toBeCloseTo((100 * 7) / 398.5);
    expect(turnoverMonthlyAvgPct([])).toBe(0);
  });
  it("absenteeism, leave rate, ratio", () => {
    expect(absenteeismPct(32, 1000)).toBeCloseTo(3.2);
    expect(absenteeismPct(1, 0)).toBe(0);
    expect(leaveRatePct(13, 1650)).toBeCloseTo(0.7879, 3);
    expect(ratio(2.26, 0.79)).toBeCloseTo(2.86, 2);
    expect(ratio(1, 0)).toBeNull();
  });
  it("overtime cost = hours × salary/173 × 1.5, whole rupiah", () => {
    expect(overtimeCostIdr(10, 5_190_000)).toBe(450_000);
    expect(overtimeCostIdr(0, 9_000_000)).toBe(0);
  });
  it("overtime buckets on the 3-month average", () => {
    expect(overtimeBucket(20)).toBe("le20");
    expect(overtimeBucket(20.17)).toBe("20to40");
    expect(overtimeBucket(40)).toBe("20to40");
    expect(overtimeBucket(40.5)).toBe("gt40");
  });
});

describe("risk level (PRD §8.4)", () => {
  const site = { turnoverPct: 1.39, absenteeismPct: 3.2 };
  it("Tinggi by turnover alone or by turnover + absence", () => {
    expect(riskLevel({ turnoverPct: 2.1, absenteeismPct: 1 }, site)).toBe("tinggi");
    expect(riskLevel({ turnoverPct: 2.02, absenteeismPct: 4.1 }, site)).toBe("tinggi");
    expect(riskLevel({ turnoverPct: 2.02, absenteeismPct: 3.5 }, site)).toBe("sedang");
  });
  it("Sedang and Rendah", () => {
    expect(riskLevel({ turnoverPct: 1.23, absenteeismPct: 3.0 }, site)).toBe("sedang");
    expect(riskLevel({ turnoverPct: 1.01, absenteeismPct: 2.2 }, site)).toBe("rendah");
  });
});
