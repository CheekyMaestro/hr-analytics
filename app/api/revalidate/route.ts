import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { errorResponse } from "@/lib/api";
import { getEnv } from "@/lib/env";

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Clears the `hr-data` cache after a pipeline run. The only POST in the app. */
export async function POST(request: NextRequest) {
  const secret = getEnv().REVALIDATE_SECRET;
  const given = request.headers.get("x-revalidate-secret") ?? "";
  if (!secret || !safeEqual(given, secret)) return errorResponse(401, "unauthorized");
  revalidateTag("hr-data", "max");
  return Response.json({ revalidated: true }, { headers: { "Cache-Control": "no-store" } });
}
