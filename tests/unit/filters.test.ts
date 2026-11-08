import { describe, expect, it } from "vitest";
import { filtersToQuery, isDefaultFilter, monthsBetween, parseFilters } from "@/lib/domain/filters";

const range = { first: "2025-01", last: "2025-12" };

describe("parseFilters", () => {
  it("defaults to the full range and all departments", () => {
    expect(parseFilters({}, range)).toEqual({ ok: true, filters: { from: "2025-01", to: "2025-12", dept: null } });
  });
  it("accepts a valid filter from URLSearchParams", () => {
    const r = parseFilters(new URLSearchParams("from=2025-07&to=2025-12&dept=hauling"), range);
    expect(r).toEqual({ ok: true, filters: { from: "2025-07", to: "2025-12", dept: "hauling" } });
  });
  it("rejects bad input instead of silently defaulting", () => {
    expect(parseFilters({ from: "2025-13" }, range)).toEqual({ ok: false, details: [{ field: "from", issue: "invalid_format" }] });
    expect(parseFilters({ to: "2026-01" }, range)).toEqual({ ok: false, details: [{ field: "to", issue: "out_of_range" }] });
    expect(parseFilters({ from: "2025-08", to: "2025-03" }, range)).toEqual({
      ok: false,
      details: [{ field: "from", issue: "after_to" }],
    });
    expect(parseFilters({ dept: "pit" }, range)).toEqual({ ok: false, details: [{ field: "dept", issue: "unknown_department" }] });
    expect(parseFilters({ dept: ["hse", "hauling"] }, range)).toEqual({ ok: false, details: [{ field: "dept", issue: "repeated" }] });
  });
});

describe("filter helpers", () => {
  it("serialises only non-default values", () => {
    expect(filtersToQuery({ from: "2025-01", to: "2025-12", dept: null }, range)).toBe("");
    expect(filtersToQuery({ from: "2025-01", to: "2025-06", dept: "hse" }, range)).toBe("?from=2025-01&to=2025-06&dept=hse");
    expect(isDefaultFilter({ from: "2025-01", to: "2025-12", dept: null }, range)).toBe(true);
  });
  it("lists months inclusively, across years", () => {
    expect(monthsBetween("2024-11", "2025-02")).toEqual(["2024-11", "2024-12", "2025-01", "2025-02"]);
  });
});
