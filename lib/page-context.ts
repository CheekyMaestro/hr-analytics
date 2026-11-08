import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { parseFilters, type DataRange, type FilterIssue, type Filters } from "@/lib/domain/filters";
import { dataRange, getMeta } from "@/lib/queries/meta";
import type { Meta } from "@/lib/queries/types";

export type SearchParams = Record<string, string | string[] | undefined>;

export type PageContext =
  | { status: "no-data" }
  | { status: "invalid"; meta: Meta; range: DataRange; details: FilterIssue[] }
  | { status: "ok"; meta: Meta; range: DataRange; filters: Filters };

/**
 * Resolve meta + filters once per request (React.cache keyed by the searchParams
 * promise), so every Suspense block on the dashboard shares the same result.
 */
export const resolvePage = cache(async (searchParams: Promise<SearchParams>): Promise<PageContext> => {
  // Await the request data first so nothing touches the database during the build prerender.
  const params = await searchParams;
  const meta = await getMeta();
  if (!meta) return { status: "no-data" };
  const range = dataRange(meta);
  const parsed = parseFilters(params, range);
  if (!parsed.ok) return { status: "invalid", meta, range, details: parsed.details };
  return { status: "ok", meta, range, filters: parsed.filters };
});

/** Data-quality page context: no filters, full data range. */
export const resolveFullRange = cache(async (): Promise<PageContext> => {
  await connection();
  const meta = await getMeta();
  if (!meta) return { status: "no-data" };
  const range = dataRange(meta);
  return { status: "ok", meta, range, filters: { from: range.first, to: range.last, dept: null } };
});
