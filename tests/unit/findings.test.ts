import { describe, expect, it } from "vitest";
import { buildFindings, renderTemplate } from "@/lib/domain/findings";
import { FINDING_TEMPLATES } from "@/content/findings";

describe("findings templating (PRD §8.5)", () => {
  it("fills placeholders and fails loudly on a missing value", () => {
    expect(renderTemplate("Turnover {x}", { x: "1,39%" })).toBe("Turnover 1,39%");
    expect(() => renderTemplate("{missing}", {})).toThrow(/missing/);
  });

  it("templates contain no hard-coded figures and avoid causal wording", () => {
    expect(FINDING_TEMPLATES).toHaveLength(3);
    for (const t of FINDING_TEMPLATES) {
      for (const text of [t.title, t.recommendation]) expect(text).not.toMatch(/\d/);
      // Bodies may only mention the "3 bulan" window from the KPI definition.
      expect(t.body.replace(/3 bulan/g, "")).not.toMatch(/\d/);
      expect(`${t.title} ${t.body} ${t.recommendation}`.toLowerCase()).not.toContain("menyebabkan");
    }
  });

  it("builds 3 findings from query results", () => {
    const findings = buildFindings({
      site: {
        headcount_start: 400,
        headcount_end: 338,
        leavers: 62,
        turnover_monthly_avg_pct: 1.39,
        turnover_annual_pct: 16.6,
        absenteeism_pct: 3.2,
        overtime_cost_idr: 6.35e9,
        overtime_hours_per_employee_month: 30,
      },
      departments: [
        {
          code: "hauling",
          name: "Hauling",
          short_code: "HL",
          headcount_start: 120,
          leavers: 26,
          turnover_pct: 2.02,
          absenteeism_pct: 4.1,
          overtime_hours_per_employee_month: 41,
          overtime_cost_idr: 2.41e9,
          cost_share_pct: 38,
          risk_level: "tinggi",
        },
      ],
      overtime: {
        buckets: [
          { bucket: "le20", label: "≤ 20 jam", rows: 1650, leavers: 13, leave_rate_pct: 0.79 },
          { bucket: "20to40", label: "20–40 jam", rows: 1780, leavers: 25, leave_rate_pct: 1.4 },
          { bucket: "gt40", label: "> 40 jam", rows: 1064, leavers: 24, leave_rate_pct: 2.26 },
        ],
        ratio_high_low: 2.86,
        ratio_high_low_excl_imputed: 2.8,
        r_overtime: 0.06,
      },
      absence: {
        leavers: { employees: 62, absenteeism_pct: 6.8 },
        stayers: { employees: 338, absenteeism_pct: 2.9 },
        ratio: 2.34,
        r_absence: 0.1,
      },
    });
    expect(findings.map((f) => f.title)).toEqual([
      "Hauling paling berisiko: turnover 1,5× rata-rata site",
      "Lembur > 40 jam: 2,9× lebih sering keluar",
      "Absensi naik menjelang keluar",
    ]);
    expect(findings[2]!.body).toContain("6,8%");
  });
});
