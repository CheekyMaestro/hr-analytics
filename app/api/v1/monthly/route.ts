import type { NextRequest } from "next/server";
import { handleFiltered } from "@/lib/api";
import { getMonthly } from "@/lib/queries/dashboard";

export async function GET(request: NextRequest) {
  return handleFiltered(request, (f) => getMonthly(f));
}
