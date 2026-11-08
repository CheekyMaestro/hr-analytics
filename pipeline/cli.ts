/**
 * Pipeline entry point: `tsx pipeline/cli.ts <command>` (wired to package.json scripts).
 *   generate   write data/raw/*.csv           (pnpm data:generate)
 *   migrate    apply db/migrations            (pnpm db:migrate)
 *   seed-ref   upsert departments + aliases   (pnpm db:seed-ref)
 *   pipeline   load + clean + revalidate      (pnpm pipeline)
 */
import { createTxDb } from "@/db/drivers";
import { writeRawCsvs } from "./generate";
import { migrateUrl } from "./migrate";
import { runPipeline } from "./run";
import { seedReference } from "./seed-ref";
import { DEFAULT_SEED } from "./lib/generator-config";
import { pipelineDatabaseUrl } from "./lib/env";

async function main(command: string | undefined): Promise<void> {
  switch (command) {
    case "generate": {
      const seed = process.env.SEED ? Number(process.env.SEED) : DEFAULT_SEED;
      if (!Number.isInteger(seed)) throw new Error("SEED harus bilangan bulat.");
      const m = await writeRawCsvs(seed);
      for (const [file, info] of Object.entries(m.files)) console.log(`${file}: ${info.rows} baris · sha256 ${info.sha256.slice(0, 12)}`);
      return;
    }
    case "migrate":
      await migrateUrl(pipelineDatabaseUrl());
      console.log("Migrasi selesai.");
      return;
    case "seed-ref": {
      const db = await createTxDb(pipelineDatabaseUrl());
      try {
        const n = await seedReference(db);
        console.log(`departments ${n.departments} · department_aliases ${n.aliases}`);
      } finally {
        await db.close();
      }
      return;
    }
    case "pipeline":
      await runPipeline();
      return;
    default:
      throw new Error(`Perintah tidak dikenal: ${command ?? "(kosong)"}. Pilihan: generate, migrate, seed-ref, pipeline.`);
  }
}

main(process.argv[2]).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
