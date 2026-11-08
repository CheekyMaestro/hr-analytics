import type { NextRequest } from "next/server";
import { handleFiltered } from "@/lib/api";
import { getDqSummary } from "@/lib/queries/data-quality";

export async function GET(request: NextRequest) {
  return handleFiltered(request, () => getDqSummary());
}
