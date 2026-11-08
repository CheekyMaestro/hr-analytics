/** Database URL for the pipeline: unpooled (transactions) first, pooled as fallback. */
export function pipelineDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL_UNPOOLED belum diisi. Jalankan `vercel env pull .env.local` atau isi .env.local (lihat .env.example).",
    );
  }
  return url;
}

export function log(message: string): void {
  console.log(message);
}
