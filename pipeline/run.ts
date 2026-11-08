/** `pnpm pipeline` — load + clean + revalidate, with a printed summary (ARCHITECTURE.md §11). */
import { execSync } from "node:child_process";
import { createTxDb } from "@/db/drivers";
import { runClean } from "./clean";
import { loadRaw, readRawFiles } from "./load";
import { triggerRevalidate } from "./revalidate";
import { pipelineDatabaseUrl } from "./lib/env";

function gitSha(): string | null {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || null;
  } catch {
    return null;
  }
}

export async function runPipeline(): Promise<void> {
  const db = await createTxDb(pipelineDatabaseUrl());
  try {
    const files = await readRawFiles();
    const loaded = await loadRaw(db, files);
    console.log(`load      raw_employees ${loaded.employees} · raw_monthly ${loaded.monthly}`);
    const r = await runClean(db, { seed: files.seed, gitSha: gitSha() });
    console.log(`clean     run ${r.runId}`);
    console.log(`          baris bersih ${r.cleanMonthlyRows} (duplikat ${r.duplicateRows}, lembur kosong ${r.overtimeNullRows})`);
    console.table(r.issues.map((i) => ({ kode: i.code, tabel: `${i.table_name}.${i.column_name}`, baris: i.rows_affected, status: i.status })));
    console.log(`golden    ${r.goldenChecked ? "cocok dengan PRD Appendix A" : "dilewati (seed bukan default atau CSV bukan dari generator)"}`);
    console.log(`revalidate ${await triggerRevalidate()}`);
  } finally {
    await db.close();
  }
}
