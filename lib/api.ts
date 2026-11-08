import "server-only";
import { unstable_rethrow } from "next/navigation";
import { connection, type NextRequest } from "next/server";
import { parseFilters, type FilterIssue, type Filters } from "@/lib/domain/filters";
import { dataRange, getMeta } from "@/lib/queries/meta";
import type { Meta } from "@/lib/queries/types";

/** Shared helpers for the thin route handlers (RULES.md §6). */

export const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };

type ErrorCode = "invalid_filter" | "unauthorized" | "not_found" | "no_data" | "internal_error";

const MESSAGES: Record<ErrorCode, string> = {
  invalid_filter: "Filter tidak valid.",
  unauthorized: "Tidak diizinkan.",
  not_found: "Alamat tidak ditemukan.",
  no_data: "Belum ada data. Jalankan pipeline untuk mengisi database.",
  internal_error: "Terjadi kesalahan di server.",
};

export function errorResponse(status: number, code: ErrorCode, details?: FilterIssue[], message?: string): Response {
  const error = { code, message: message ?? MESSAGES[code], ...(details ? { details } : {}) };
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function filterMessage(details: FilterIssue[]): string {
  if (details.some((d) => d.field === "dept")) return "Departemen tidak dikenal.";
  return "Periode tidak valid.";
}

export type Handler<T> = (filters: Filters, meta: Meta) => Promise<T | null>;

/** Parse filters → run one query → JSON, with the error envelope of ARCHITECTURE.md §6.4. */
export async function handleFiltered<T>(request: NextRequest, run: Handler<T>, format: (data: T, f: Filters) => Response = json): Promise<Response> {
  await connection(); // API responses are request-time (CDN caching via Cache-Control).
  try {
    const meta = await getMeta();
    if (!meta) return errorResponse(503, "no_data");
    const parsed = parseFilters(request.nextUrl.searchParams, dataRange(meta));
    if (!parsed.ok) return errorResponse(400, "invalid_filter", parsed.details, filterMessage(parsed.details));
    const data = await run(parsed.filters, meta);
    if (data === null) return errorResponse(503, "no_data");
    return format(data, parsed.filters);
  } catch (err) {
    unstable_rethrow(err);
    console.log(JSON.stringify({ level: "error", route: request.nextUrl.pathname, message: err instanceof Error ? err.message : String(err) }));
    return errorResponse(500, "internal_error");
  }
}

function json<T>(data: T): Response {
  return Response.json(data, { headers: CACHE_HEADERS });
}

/** CSV with BOM so Excel opens UTF-8 correctly (FR-31). */
export function csvResponse(name: string, f: Filters, columns: readonly string[], rows: ReadonlyArray<Record<string, unknown>>): Response {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = "﻿" + [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      ...CACHE_HEADERS,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${f.from}-${f.to}.csv"`,
    },
  });
}
