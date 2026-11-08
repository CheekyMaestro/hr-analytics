/** `pnpm data:generate` — write the two raw CSVs and a manifest to data/raw/. */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { EMPLOYEE_COLUMNS, generateDataset, MONTHLY_COLUMNS, toCsv } from "./lib/generator";

export const RAW_DIR = path.join(process.cwd(), "data", "raw");
export const EMPLOYEES_FILE = "E_site_employees.csv";
export const MONTHLY_FILE = "E_site_monthly.csv";
export const MANIFEST_FILE = "manifest.json";

export type Manifest = { seed: number; files: Record<string, { rows: number; sha256: string }> };

export const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

export function buildCsvs(seed: number): { employees: string; monthly: string; manifest: Manifest } {
  const ds = generateDataset(seed);
  const employees = toCsv(EMPLOYEE_COLUMNS, ds.employees);
  const monthly = toCsv(MONTHLY_COLUMNS, ds.monthly);
  return {
    employees,
    monthly,
    manifest: {
      seed,
      files: {
        [EMPLOYEES_FILE]: { rows: ds.employees.length, sha256: sha256(employees) },
        [MONTHLY_FILE]: { rows: ds.monthly.length, sha256: sha256(monthly) },
      },
    },
  };
}

export async function writeRawCsvs(seed: number, dir = RAW_DIR): Promise<Manifest> {
  const { employees, monthly, manifest } = buildCsvs(seed);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, EMPLOYEES_FILE), employees, "utf8");
  await writeFile(path.join(dir, MONTHLY_FILE), monthly, "utf8");
  await writeFile(path.join(dir, MANIFEST_FILE), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifest;
}
