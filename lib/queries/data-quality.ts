import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db/client";
import type { Filters } from "@/lib/domain/filters";
import { readDqAliases, readDqIssues, readDqSummary, readMonthlyRows, readOvertimeNull } from "./readers";

export async function getDqSummary() {
  "use cache";
  cacheTag("hr-data");
  cacheLife("days");
  const db = await getDb();
  return db ? readDqSummary(db) : null;
}

export async function getDqIssues() {
  "use cache";
  cacheTag("hr-data");
  cacheLife("days");
  const db = await getDb();
  return db ? readDqIssues(db) : null;
}

export async function getDqAliases() {
  "use cache";
  cacheTag("hr-data");
  cacheLife("days");
  const db = await getDb();
  return db ? readDqAliases(db) : null;
}

/** Overtime-null panel; the sensitivity check uses the full data range. */
export async function getOvertimeNull(f: Filters) {
  "use cache";
  cacheTag("hr-data");
  cacheLife("days");
  const db = await getDb();
  return db ? readOvertimeNull(db, f) : null;
}

/** Clean employee-month rows for the CSV export. */
export async function getMonthlyRows(f: Filters) {
  "use cache";
  cacheTag("hr-data");
  cacheLife("days");
  const db = await getDb();
  return db ? readMonthlyRows(db, f) : null;
}
