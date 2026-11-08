import type { NextRequest } from "next/server";
import { handleFiltered } from "@/lib/api";
import { getDepartments } from "@/lib/queries/dashboard";

export async function GET(request: NextRequest) {
  return handleFiltered(request, (f) => getDepartments(f));
}
