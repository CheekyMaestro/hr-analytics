/**
 * TestNoHardcodedNumbers (RULES.md §8): no digits inside JSX text in
 * components/dashboard/** — every figure must come from data via format.ts.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dir = path.join(process.cwd(), "components", "dashboard");

/** JSX text = characters between `>` and the next `<` or `{` that are not inside a tag. */
function jsxTextWithDigits(source: string): string[] {
  const hits: string[] = [];
  const re = />([^<>{}]*)(?=[<{])/g;
  for (const m of source.matchAll(re)) {
    const text = m[1]!.trim();
    // Skip TypeScript generics / arrow functions captured by the loose pattern.
    if (!text || /=>|[;()=]/.test(text)) continue;
    if (/\d/.test(text)) hits.push(text);
  }
  return hits;
}

describe("no hard-coded numbers in dashboard JSX", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));
  it("finds dashboard components", () => expect(files.length).toBeGreaterThan(5));
  for (const file of files) {
    it(file, () => {
      expect(jsxTextWithDigits(readFileSync(path.join(dir, file), "utf8"))).toEqual([]);
    });
  }
});
