import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-shell bg-shell p-8">
      <h1 className="text-h1">Halaman tidak ditemukan</h1>
      <p className="text-body text-muted">Alamat yang dibuka tidak ada di situs ini.</p>
      <Link href="/" className="inline-flex min-h-touch items-center rounded-pill bg-primary px-5 font-semibold text-primary-foreground">
        Kembali ke dashboard
      </Link>
    </div>
  );
}
