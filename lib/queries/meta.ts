import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db/client";
import type { DataRange } from "@/lib/domain/filters";
import { readMeta } from "./readers";
import type { Meta } from "./types";

export async function getMeta() {
  "use cache";
  cacheTag("hr-data");
  cacheLife("days");
  const db = await getDb();
  return db ? readMeta(db) : null;
}

export function dataRange(meta: Meta): DataRange {
  return { first: meta.months[0]!, last: meta.months[meta.months.length - 1]! };
}
