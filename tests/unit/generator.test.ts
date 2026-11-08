import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCsvs } from "@/pipeline/generate";
import { generateDataset } from "@/pipeline/lib/generator";
import { DEFAULT_SEED, DEPTS } from "@/pipeline/lib/generator-config";

describe("dummy-data generator (PRD §7)", () => {
  const ds = generateDataset(DEFAULT_SEED);
  const canonical = new Set(DEPTS.map((d) => d.name));

  it("produces the exact row counts and defect counts", () => {
    expect(ds.employees).toHaveLength(400);
    expect(ds.monthly).toHaveLength(4514);
    expect(ds.monthly.filter((r) => !canonical.has(r.department))).toHaveLength(1126);
    expect(ds.employees.filter((r) => !canonical.has(r.department))).toHaveLength(97);
    expect(new Set([...ds.monthly, ...ds.employees].map((r) => r.department)).size).toBe(16);
    expect(ds.monthly.filter((r) => r.overtime_hours === "")).toHaveLength(312);
    const keys = ds.monthly.map((r) => Object.values(r).join("|"));
    expect(keys.length - new Set(keys).size).toBe(20);
  });

  it("does not create DQ-05 … DQ-08 violations", () => {
    const ids = new Set(ds.employees.map((e) => e.employee_id));
    const exits = new Map<string, string[]>();
    for (const r of ds.monthly) {
      expect(Number(r.absent_days)).toBeLessThanOrEqual(Number(r.work_days));
      expect(ids.has(r.employee_id)).toBe(true);
      if (r.left_this_month === "1") exits.set(r.employee_id, [...(exits.get(r.employee_id) ?? []), r.month]);
    }
    for (const [id, months] of exits) {
      expect(new Set(months).size).toBe(1);
      expect(ds.monthly.some((r) => r.employee_id === id && r.month > months[0]!)).toBe(false);
    }
  });

  it("is deterministic: the committed CSVs are byte-identical to the generator output", async () => {
    const committed = JSON.parse(await readFile(path.join(process.cwd(), "data/raw/manifest.json"), "utf8"));
    expect(buildCsvs(DEFAULT_SEED).manifest).toEqual(committed);
  }, 30_000);
});
