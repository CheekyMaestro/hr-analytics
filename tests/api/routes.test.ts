/**
 * Route handler tests (RULES.md §8): filter validation, error envelope, CSV
 * headers, revalidate secret. Runs the real handlers against an in-process
 * PGlite database seeded by the pipeline.
 */
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), connection: async () => {} }));

import { fromPglite } from "@/db/drivers";
import { setDbForTesting } from "@/db/client";
import { buildCsvs } from "@/pipeline/generate";
import { loadRaw } from "@/pipeline/load";
import { runClean } from "@/pipeline/clean";
import { migratePglite } from "@/pipeline/migrate";
import { seedReference } from "@/pipeline/seed-ref";
import { DEFAULT_SEED } from "@/pipeline/lib/generator-config";
import { GET as summary } from "@/app/api/v1/summary/route";
import { GET as meta } from "@/app/api/v1/meta/route";
import { GET as exportFile } from "@/app/api/v1/export/[file]/route";
import { POST as revalidate } from "@/app/api/revalidate/route";
import { revalidatedTags } from "../stubs/next-cache";

const req = (url: string, init?: ConstructorParameters<typeof NextRequest>[1]) => new NextRequest(new URL(url, "http://test.local"), init);
let client: PGlite;

beforeAll(async () => {
  client = await PGlite.create();
  await migratePglite(client);
  const db = await fromPglite(client);
  setDbForTesting(db);
}, 120_000);

afterAll(async () => {
  setDbForTesting(null);
  await client.close();
});

describe("before the first pipeline run", () => {
  it("returns 503 no_data", async () => {
    const res = await summary(req("/api/v1/summary"));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("no_data");
  });
});

describe("with data", () => {
  beforeAll(async () => {
    const db = await fromPglite(client);
    await seedReference(db);
    const csv = buildCsvs(DEFAULT_SEED);
    await loadRaw(db, { employees: csv.employees, monthly: csv.monthly, seed: DEFAULT_SEED });
    await runClean(db, { seed: DEFAULT_SEED, verifyGolden: false });
  }, 120_000);

  it("serves the summary with cache headers", async () => {
    const res = await summary(req("/api/v1/summary?dept=hauling"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=3600");
    const body = await res.json();
    expect(body).toMatchObject({ headcount_start: 120, leavers: 26 });
  });

  it("rejects invalid filters with the error envelope", async () => {
    const bad = await summary(req("/api/v1/summary?from=2025-09&to=2025-02"));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({
      error: { code: "invalid_filter", message: "Periode tidak valid.", details: [{ field: "from", issue: "after_to" }] },
    });
    const dept = await summary(req("/api/v1/summary?dept=pit"));
    expect((await dept.json()).error.details[0]).toEqual({ field: "dept", issue: "unknown_department" });
  });

  it("returns meta", async () => {
    const body = await (await meta(req("/api/v1/meta"))).json();
    expect(body.months).toHaveLength(12);
    expect(body.departments).toHaveLength(6);
  });

  it("exports CSV with BOM and a filtered filename", async () => {
    const res = await exportFile(req("/api/v1/export/monthly.csv?from=2025-01&to=2025-03"), {
      params: Promise.resolve({ file: "monthly.csv" }),
    });
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="monthly-2025-01-2025-03.csv"');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM
    const text = new TextDecoder().decode(bytes);
    expect(text.split("\r\n")[0]).toMatch(/^employee_id,month,department_code/);
    const unknown = await exportFile(req("/api/v1/export/x.csv"), { params: Promise.resolve({ file: "x.csv" }) });
    expect(unknown.status).toBe(404);
  });
});

describe("revalidate", () => {
  it("needs the secret", async () => {
    process.env.REVALIDATE_SECRET = "s".repeat(32);
    vi.resetModules();
    const { POST } = await import("@/app/api/revalidate/route");
    expect((await POST(req("/api/revalidate", { method: "POST" }))).status).toBe(401);
    expect((await POST(req("/api/revalidate", { method: "POST", headers: { "x-revalidate-secret": "wrong" } }))).status).toBe(401);
    const ok = await POST(req("/api/revalidate", { method: "POST", headers: { "x-revalidate-secret": "s".repeat(32) } }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ revalidated: true });
    void revalidate;
    void revalidatedTags;
  });
});
