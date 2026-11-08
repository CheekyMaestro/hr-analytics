import { z } from "zod";

/** Environment, validated once (RULES.md §2: config read once in lib/env.ts). */
const schema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  DATABASE_URL_UNPOOLED: z.string().min(1).optional(),
  REVALIDATE_SECRET: z.string().min(16).optional(),
  REVALIDATE_URL: z.url().optional(),
  SEED: z.coerce.number().int().optional(),
  NEXT_PUBLIC_REPO_URL: z.url().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const raw = Object.fromEntries(
    Object.entries({
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
      REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
      REVALIDATE_URL: process.env.REVALIDATE_URL,
      SEED: process.env.SEED,
      NEXT_PUBLIC_REPO_URL: process.env.NEXT_PUBLIC_REPO_URL,
    }).filter(([, v]) => v !== undefined && v !== ""),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Environment variable tidak valid: ${fields}`);
  }
  cached = parsed.data;
  return cached;
}
