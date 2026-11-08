import type { NextRequest } from "next/server";
import { handleFiltered } from "@/lib/api";

export async function GET(request: NextRequest) {
  return handleFiltered(request, async (_f, meta) => meta);
}
