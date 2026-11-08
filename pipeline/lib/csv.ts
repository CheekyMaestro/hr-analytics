import Papa from "papaparse";

/** Parse a CSV with a header row; every value stays text, exactly as written (no trimming). */
export function parseCsv(text: string): Record<string, string>[] {
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (res.errors.length) {
    const e = res.errors[0]!;
    throw new Error(`CSV tidak valid (baris ${e.row ?? "?"}): ${e.message}`);
  }
  return res.data;
}
