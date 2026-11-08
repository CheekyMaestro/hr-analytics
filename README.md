# HR Analytics · Site Tambang

Dashboard satu halaman untuk **absensi, lembur, dan turnover** di site tambang, plus halaman **Data Quality Log** yang menunjukkan semua pembersihan data di baliknya. Proyek portofolio oleh **Athayya Ari Rafeyfa Sajjida**.

> Semua data adalah **data dummy** (400 karyawan, 12 bulan 2025) yang dibuat generator dengan seed tetap `20251231`. Tidak ada nama perusahaan, logo, atau data karyawan asli.

- `/` — 4 KPI, tren turnover vs absensi, risiko per departemen, lembur vs keluar, absen sebelum keluar, biaya lembur per departemen, 3 temuan + rekomendasi, tabel detail. Filter periode & departemen tersimpan di URL.
- `/data-quality` — ringkasan pembersihan (4.514 → 4.494 baris), log DQ-01 … DQ-08, penyeragaman 16 ejaan → 6 departemen, penanganan lembur kosong + uji sensitivitas, definisi KPI, batasan data.
- `/api/v1/*` — API JSON read-only dan ekspor CSV (UTF-8 + BOM, bisa dibuka Excel).

Dokumen desain: [PRD.md](PRD.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [SCHEMA.md](SCHEMA.md) · [RULES.md](RULES.md) · [DESIGN.md](DESIGN.md)

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript strict · Tailwind CSS v4 · Recharts · Neon Serverless Postgres (via Vercel Marketplace) · Drizzle · zod · Vitest + PGlite · Playwright + axe.

## Menjalankan secara lokal (tanpa server Postgres)

Butuh Node ≥ 22 dan pnpm.

```bash
pnpm install
cp .env.example .env.local
# di .env.local aktifkan dua baris PGlite:
#   DATABASE_URL=pglite:./.data/pglite
#   DATABASE_URL_UNPOOLED=pglite:./.data/pglite
mkdir .data
pnpm db:setup          # migrate → seed referensi → generate CSV → pipeline
pnpm build && pnpm start
```

Buka http://localhost:3000. `pnpm db:setup` mencetak tabel hasil DQ dan `golden cocok dengan PRD Appendix A`. (Revalidate akan memberi peringatan bila server belum jalan — itu normal.)

> PGlite hanya untuk lokal/test. Satu folder PGlite hanya bisa dibuka satu proses: hentikan server sebelum menjalankan `pnpm pipeline` lagi.

## Deploy ke Vercel + Neon (± 15 menit)

1. Push repo ke GitHub. Di Vercel: **Add New → Project → Import** repo ini (preset Next.js, build `pnpm build`).
2. Di project Vercel: **Storage → Neon (Serverless Postgres) → Add**, pilih plan Free dan region **Singapore (aws-ap-southeast-1)**, hubungkan ke Production, Preview, Development. Vercel mengisi `DATABASE_URL` dan `DATABASE_URL_UNPOOLED`.
3. Region function sudah diset ke `sin1` di [vercel.json](vercel.json).
4. **Settings → Environment Variables**: tambahkan `REVALIDATE_SECRET` (32 byte acak, base64) untuk semua environment.
5. Di laptop:
   ```bash
   vercel link
   vercel env pull .env.local
   # tambahkan ke .env.local: REVALIDATE_URL=https://<project>.vercel.app/api/revalidate
   pnpm install
   pnpm db:setup
   ```
6. Buka URL produksi dan cek `/api/health` → `{"ok":true,"db":"up",…}`.

Build Vercel tetap sukses walau database kosong; halaman lalu menampilkan "Belum ada data".

Opsional: workflow **Pipeline** (`.github/workflows/pipeline.yml`, manual) menjalankan pipeline dari GitHub Actions dengan secret `DATABASE_URL_UNPOOLED`, `REVALIDATE_URL`, `REVALIDATE_SECRET`.

## Skrip

| Perintah | Fungsi |
|---|---|
| `pnpm data:generate` | Tulis `data/raw/E_site_employees.csv` (400) dan `E_site_monthly.csv` (4.514) + `manifest.json` |
| `pnpm db:migrate` | Terapkan migrasi SQL di `db/migrations` |
| `pnpm db:seed-ref` | Isi `departments` dan `department_aliases` dari `data/*.csv` |
| `pnpm pipeline` | Load raw → clean (1 transaksi) → verifikasi golden → revalidate cache |
| `pnpm db:setup` | Semua langkah di atas berurutan |
| `pnpm test` | Unit + API test |
| `pnpm test:golden` | Pipeline di Postgres in-process (PGlite) → semua angka PRD Appendix A |
| `pnpm test:e2e` | Playwright + axe pada `BASE_URL` (default `http://localhost:3000`; `PW_CHANNEL=chrome` untuk memakai Chrome terpasang) |
| `pnpm lint` · `pnpm typecheck` | ESLint (termasuk batas impor antar-lapisan) · TypeScript |

## Struktur

```
app/            halaman, blok data (app/_blocks), route handler /api
components/     ui, shell, dashboard, data-quality (data masuk lewat props)
lib/domain/     fungsi murni: KPI, risiko, format id-ID, filter, templating temuan
lib/queries/    readers (SQL) + fungsi ber-cache ('use cache', tag hr-data)
content/        template temuan, definisi KPI, batasan data
db/             schema Drizzle, migrasi SQL, driver (Neon / Postgres / PGlite)
pipeline/       generator, load, clean, checks DQ-01…08, verifikasi Appendix A
data/           CSV referensi + CSV mentah hasil generator (di-commit)
tests/          unit, api, golden, e2e
```

## Catatan analisis

Semua hubungan antara lembur/absensi dan karyawan keluar adalah **korelasi, bukan sebab-akibat**. Batasan data lengkap ada di halaman Data Quality Log (`/data-quality#batasan`).
