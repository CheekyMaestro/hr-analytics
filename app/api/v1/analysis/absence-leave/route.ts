import type { NextRequest } from "next/server";
import { handleFiltered } from "@/lib/api";
import { getAbsenceLeave } from "@/lib/queries/dashboard";

export async function GET(request: NextRequest) {
  return handleFiltered(request, (f) => getAbsenceLeave(f));
}
