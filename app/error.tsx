"use client";

export default function ErrorPage({ retry }: { error: Error; retry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-shell bg-shell p-8">
      <h1 className="text-h1">Data gagal dimuat</h1>
      <p className="text-body text-muted">Terjadi kesalahan saat menyiapkan halaman. Silakan coba lagi.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="inline-flex min-h-touch items-center rounded-pill bg-primary px-5 font-semibold text-primary-foreground"
      >
        Coba lagi
      </button>
    </div>
  );
}
