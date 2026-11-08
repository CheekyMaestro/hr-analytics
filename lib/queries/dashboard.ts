import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db/client";
import type { Filters } from "@/lib/domain/filters";
import {
  readAbsenceLeave,
  readDepartments,
  readFindings,
  readMonthly,
  readOvertimeLeave,
  readSummary,
} from "./readers";

/** Cached, read-only query functions (ARCHITECTURE.md §5). Return null when there is no data yet. */

export async function getSummary(f: Filters) {
  "use cache";
  cacheTag("hr-data");
  cacheLife("days");
  const db = await getDb();
  return db ? readSummary(db, f) : null;
}

export async function getMonthly(f: Filters) {
  "use cache";
  cacheTag("hr-data");
  cacheLife("days");
  const db = await getDb();
  return db ? readMonthly(db, f) : null;
}

export async function getDepartments(f: Filters) {
  "use cache";
  cacheTag("hr-data");
  cacheLife("days");
  const db = await getDb();
  return db ? readDepartments(db, f) : null;
}

export async function getOvertimeLeave(f: Filters) {
  "use cache";
  cacheTag("hr-data");
  cacheLife("days");
  const db = await getDb();
  return db ? readOvertimeLeave(db, f) : null;
}

export async function getAbsenceLeave(f: Filters) {
  "use cache";
  cacheTag("hr-data");
  cacheLife("days");
  const db = await getDb();
  return db ? readAbsenceLeave(db, f) : null;
}

export async function getFindings(f: Filters) {
  "use cache";
  cacheTag("hr-data");
  cacheLife("days");
  const db = await getDb();
  return db ? readFindings(db, f) : null;
}
