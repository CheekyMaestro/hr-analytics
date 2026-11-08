/** POST /api/revalidate after a successful run (FR-07). A failure only warns. */
export async function triggerRevalidate(): Promise<"ok" | "skipped" | "failed"> {
  const url = process.env.REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) {
    console.warn("Peringatan: REVALIDATE_URL / REVALIDATE_SECRET belum diisi, cache situs tidak di-refresh.");
    return "skipped";
  }
  try {
    const res = await fetch(url, { method: "POST", headers: { "x-revalidate-secret": secret } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return "ok";
  } catch (err) {
    console.warn(`Peringatan: revalidate gagal (${err instanceof Error ? err.message : String(err)}).`);
    return "failed";
  }
}
