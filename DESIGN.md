# HR ANALYTICS — DESIGN.md

> **Revision 1.** Visual and interaction design for `hr-analytics-site` (Next.js). Derived from `PRD.md` (UC-01 … UC-10, FR-10 … FR-43) and the API in `ARCHITECTURE.md §6`. Visual direction: a soft lavender analytics dashboard with a light and a dark theme — pill navigation, white rounded cards inside a tinted content panel, smooth line charts, a donut for cost split. The approved mockup is the canvas **"HR Analytics – Mockup Dashboard & Data Quality Log"** (4 artboards: Dashboard terang/gelap, Data Quality Log terang/gelap); when this file and the mockup disagree, this file wins.
>
> **Rules for AI agents.** Use only the tokens, components, routes, and copy rules defined here. Do not invent new colours, font sizes, or radii; do not hard-code hex values in components. Every page calls only the query functions / endpoints listed in `ARCHITECTURE.md`. If a screen needs something not defined here, stop and ask, or propose an addition to this file in the same pull request.

---

## 1. Design Principles

1. **Answer first.** The first screen answers "how is the site doing and where is the risk": 4 KPI cards, the trend, the risk list. Details come below.
2. **Show the work.** Cleaning and definitions are a first-class page, not a footnote. A reviewer should trust the numbers because they can see where they came from.
3. **Plain Indonesian.** Short sentences, HR vocabulary the user already uses (*absensi, lembur, turnover, headcount, resign*). No statistics jargon in headlines; `r` values only in small text.
4. **Calm, readable, two themes.** Lavender carries the brand; contrast rules (§3.4) are never traded for mood. Every screen is designed in light and dark.
5. **Desktop-optimised, phone-usable.** Recruiters open the link on a laptop; it must still read well on a phone (cards stack, tables scroll).

---

## 2. Tech Stack (frontend)

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4, tokens declared once in `app/globals.css` (`@theme` + `:root` / `.dark` CSS variables) |
| Components | shadcn/ui (Radix), restyled through the tokens |
| Charts | Recharts; colours from `lib/chart-theme.ts` (reads CSS variables) |
| Icons | lucide-react, stroke width 1.75, sizes 16 / 20 / 24 |
| Theme | next-themes, `attribute="class"`, `defaultTheme="system"`, storage key `hr-theme` |
| Fonts | `next/font/google`: **Plus Jakarta Sans** (400, 500, 600, 700, 800); numbers with `font-variant-numeric: tabular-nums` |
| Numbers | `Intl.NumberFormat('id-ID')` via `lib/domain/format.ts` |

---

## 3. Design Tokens

### 3.1 Brand palette (source)

| Name | Hex | Role |
|---|---|---|
| Ungu | `#6D4AE8` | Primary brand (light): active nav, primary series, buttons |
| Lavender | `#EFEBFA` | Page background (light) |
| Lavender muda | `#EEE9FF` | Soft fills: recommendation box, risk avatar, selected row |
| Kuning tua | `#B7791F` | Second series (absenteeism), highest overtime bucket (light) |
| Ungu terang | `#9F86FF` | Primary brand (dark) |
| Kuning | `#F7C548` | Second series (dark) |
| Malam | `#121016` | Page background (dark) |

### 3.2 Semantic tokens

Components use **only** these names (CSS variables `--color-*`, exposed as Tailwind colours `bg-page`, `bg-surface`, `text-muted`, …).

| Token | Light | Dark | Use |
|---|---|---|---|
| `page` | `#EFEBFA` | `#121016` | Page background, sidebar background |
| `shell` | `#E6E1F7` | `#1A1820` | Large rounded content panel behind the cards |
| `surface` | `#FFFFFF` | `#23212B` | Cards, tables, selects, popovers |
| `surface-muted` | `#F6F3FD` | `#2B2934` | Table header, bar tracks, code blocks |
| `border` | `#E2DCF3` | `#34313F` | Dividers, input and card borders |
| `text` | `#1E1B2E` | `#F3F1F8` | Body and headings |
| `text-muted` | `#5F5A73` | `#A9A4B8` | Captions, helper text, axis labels |
| `primary` | `#6D4AE8` | `#9F86FF` | Active nav pill, primary series, links, focus ring |
| `primary-foreground` | `#FFFFFF` | `#1A1530` | Text/icons on `primary` |
| `soft` | `#EEE9FF` | `#332C4F` | Recommendation box, avatar chip, selected row |
| `series-2` | `#B7791F` | `#F7C548` | Absenteeism line, ">40 jam" bar, leavers bar |
| `series-3` | `#1E8C83` | `#4FC3B8` | Third series when needed |
| `grid` | `#ECE8F6` | `#34313F` | Chart grid lines |
| `success` | `#16704C` | `#4FD1A5` | Rendah, Diperbaiki |
| `warning` | `#8A5C00` | `#F2B256` | Sedang, Perlu konfirmasi |
| `danger` | `#B02A46` | `#FF8095` | Tinggi, Gagal, turnover note on KPI card |
| `info` | `#3D6BD6` | `#8FB3F0` | Informational banners |

Status colours are used as text/icon on `surface`, or as a **12% tint fill (14% in dark) with the full colour as text**. Never as the only signal: always pair with a label.

### 3.3 Chart palette (categorical, in this order)

| # | Light | Dark | Typical use |
|---|---|---|---|
| 1 | `#6D4AE8` | `#9F86FF` | Hauling / primary series |
| 2 | `#B7791F` | `#F7C548` | Mining Operations / second series |
| 3 | `#1E8C83` | `#4FC3B8` | Plant & Maintenance |
| 4 | `#5E8A12` | `#C6EF5A` | HSE |
| 5 | `#3D6BD6` | `#8FB3F0` | HR & GA |
| 6 | `#8C82A8` | `#A79CC4` | Finance |

Light colours are ≥ 3:1 against `surface` (non-text contrast). Donut segments are separated by a 2 px `surface`-coloured gap and always come with a legend showing name, value, and %.

Line charts: series 1 solid 3 px with a 12% area fill; series 2 dashed (`7 6`) 3 px, so the two lines differ in pattern as well as colour.

### 3.4 Contrast (verified, WCAG AA)

| Pair | Ratio | Allowed for |
|---|---|---|
| `text` on `surface` (light) | 16.78 | All text |
| `text` on `page` (light) | 14.33 | All text |
| `text-muted` on `surface` (light) | 6.57 | Body, captions |
| `text-muted` on `shell` (light) | 5.15 | Captions |
| `text-muted` on `soft` (light) | 5.55 | Captions |
| `primary-foreground` on `primary` (light) | 5.53 | Nav pill, buttons |
| `primary` on `surface` (light) | 5.53 | Links, "TEMUAN 01" label |
| `primary` on `page` (light) | 4.73 | Links on page background |
| `series-2` on `surface` (light) | 3.64 | **Graphics only** (lines, bars), not text |
| `series-3` on `surface` (light) | 4.09 | Graphics; not body text |
| `success` / `warning` / `danger` on their 12% tint | 5.12 / 4.90 / 5.30 | Badge text (13 px, 700) |
| `text` on `surface` (dark) | 14.16 | All text |
| `text` on `page` (dark) | 16.87 | All text |
| `text-muted` on `surface` (dark) | 6.56 | Body, captions |
| `text-muted` on `shell` (dark) | 7.27 | Captions |
| `primary-foreground` on `primary` (dark) | 6.14 | Nav pill, buttons |
| `primary` on `surface` (dark) | 5.54 | Links, labels |
| `series-2` on `surface` (dark) | 9.85 | Lines, bars, and text |
| `danger` / `success` / `warning` on 14% tint (dark) | 5.21 / 6.23 / 6.37 | Badge text |
| Chart palette (light) on `surface` | 3.58 – 5.53 | Graphics |

### 3.5 Typography

| Style | Size / line-height | Weight | Use |
|---|---|---|---|
| `h1` | 30 / 38 | 700, tracking −0.02em | Page title ("Ringkasan HR Site") |
| `kpi` | 32 / 40 | 700, tabular | KPI card value |
| `stat` | 28 / 36 | 700, tabular | Data quality summary value |
| `h2` | 20 / 28 | 700 | Card / section title |
| `h3` | 16 / 24 | 700 | Finding title, KPI definition title |
| `body` | 15 / 24 | 400 | Default text |
| `body-sm` | 14 / 22 | 400–600 | Finding body, table cells, list rows |
| `small` | 13 / 20 | 500–700 | Captions, badges, axis labels, legends |
| `overline` | 13 / 20 | 800, uppercase | "TEMUAN 01" |
| `mono` | 13 / 20 | 400 | DQ codes, column names, raw spellings, formulas |
| `brand` | 18 / 24 | 800 | "HR Analytics" in the sidebar |

Minimum text size anywhere: 12 px (chart axis labels only); 13 px for everything else. Selects and inputs use 16 px text below 768 px (prevents iOS zoom).

### 3.6 Spacing, radius, elevation, focus

- **Spacing scale (px):** 4, 8, 12, 16, 20, 24, 32, 40. Page padding 24 (16 on mobile). Card padding 20. Gap between cards 16; between sections inside the shell 20.
- **Radius:** `pill` 999 (nav items, buttons, selects, badges, theme toggle), `sm` 12 (table header ends, code blocks, bar ends use pill), `md` 14 (recommendation box, avatar chip), `card` 20 (all cards), `shell` 28 (content panel).
- **Elevation:** light: cards `0 1px 2px rgba(30,27,46,.06)`; popovers `0 12px 32px rgba(30,27,46,.16)`. Dark: no card shadow (surfaces separate by tone); popovers `0 12px 32px rgba(0,0,0,.5)`.
- **Focus:** 2 px `primary` outline, 2 px offset, on every interactive element, both themes.
- **Touch targets:** ≥ 44 × 44 px.

---

## 4. Layout

### 4.1 App shell (both pages)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ page background                                                          │
│ ┌──────────┐  Ringkasan HR Site                [Periode ▾] [Departemen ▾]│
│ │ ▮▮▮ HR   │  Absensi, lembur, turnover · …                     [☀ | ☾] │
│ │ Analytics│  ┌──────────────────── shell (radius 28) ──────────────────┐ │
│ │          │  │ [KPI] [KPI] [KPI] [KPI]                                 │ │
│ │ (●) Dash │  │ [Trend chart ─────────────────] [Risiko per departemen] │ │
│ │ ( ) DQ   │  │ [Lembur vs keluar] [Absen sblm keluar] [Biaya lembur ◔] │ │
│ │ ( ) Def. │  │ 3 temuan & rekomendasi: [01] [02] [03]                  │ │
│ │ ( ) CSV  │  │ [Detail per departemen — table ───────────────────────] │ │
│ │          │  └─────────────────────────────────────────────────────────┘ │
│ │ [author] │  footer: Data dummy · sumber · pipeline terakhir            │
│ └──────────┘                                                             │
└──────────────────────────────────────────────────────────────────────────┘
```

- Max content width 1400 px, centred. Sidebar 220–248 px, no background of its own (sits on `page`), not sticky.
- The **shell** is the tinted rounded panel that holds all cards (the "frame inside a frame" look of the reference).
- Header: `h1` + one-line description left; filters and theme toggle right; wraps below 1024 px.
- **Below 768 px:** sidebar collapses into a top bar (logo + 44 px menu button opening a `Sheet` with the same nav); filter bar becomes full width; all card rows stack to one column; shell padding 12.

### 4.2 Navigation

| Label | Route | Icon (lucide) |
|---|---|---|
| Dashboard | `/` | `layout-dashboard` |
| Data Quality Log | `/data-quality` | `shield-check` |
| Definisi KPI | `/data-quality#definisi` | `book-open` |
| Unduh data bersih | `/api/v1/export/monthly.csv` (keeps current filter) | `download` |

Active item: `primary` pill with `primary-foreground` text and `aria-current="page"`. Inactive: transparent, `text`; hover `surface` fill.

**Author card** (bottom of sidebar): `surface` card with border, "Proyek portofolio" (small, muted), **Athayya Ari Rafeyfa Sajjida** (14/700), "Semua angka berasal dari data dummy 400 karyawan." Optional "Lihat kode" link when `NEXT_PUBLIC_REPO_URL` is set.

---

## 5. Components

| Component | Spec |
|---|---|
| **ThemeToggle** | Pill, height 44, border `border`, `surface` fill, two 36 × 34 segments (sun, moon). Active segment `primary` fill + `primary-foreground` icon. One `<button>` with `aria-label` "Ganti ke tema gelap/terang". |
| **Select (filter)** | Label above (`small` 600 muted), pill 44 px, `surface` fill, border `border`. Periode: Jan–Des 2025, Jan–Jun 2025, Jul–Des 2025, "Pilih bulan…" (opens two month selects). Departemen: Semua departemen + 6. |
| **KpiCard** | `surface`, radius `card`, padding 20. Title `small`/14 600 muted; decorative ↗ circle icon (28 px, 1.5 px `primary` border, `aria-hidden`); value `kpi`; note `small` 500 (muted, or `danger` for the turnover note). |
| **TrendChart** | Card with `h2` "Turnover vs absensi per bulan", legend right (line swatch solid vs dashed). Y axis 0–4% (step 1), month labels `Jan … Des`. Highlight the max-turnover month with a dashed guide line, a ring marker, and a dark tooltip pill ("Des · 2,31%"). Hover tooltip shows both series for the month. |
| **RiskList** | Card with `h2`, caption "Diurutkan dari turnover bulanan tertinggi". Rows: 36 px `soft` square with department short code, name (14/600), "Turnover x · absen y" (13 muted), risk badge. Divider `border`. |
| **BucketBars** (Lembur vs keluar) | Label left + rate right (14), 12 px pill track `surface-muted`, fill `primary`; the highest bucket uses `series-2`. Detail line "13 keluar dari 1.650 baris". Summary line bold at the bottom ("Lembur > 40 jam: 2,9× lebih sering keluar"). |
| **PairBars** (Absen sebelum keluar) | Two vertical bars 64 px wide, radius 14, heights proportional; leavers `series-2`, stayers `primary`; value above, group label + count below. |
| **CostDonut** | 168 px ring, 28 px thick, total in the centre (`Rp 6,35 M` 20/800 + "total 2025"), 2-column legend with swatch, name, value · %. `role="img"` with full `aria-label`. |
| **FindingCard** | Overline "TEMUAN 01" in `primary`, `h3` title, body `body-sm` muted with at least one figure, then a `soft` box (radius 14) "Rekomendasi" + one sentence. Cards equal height in a row. |
| **DataTable** | Header `surface-muted`, 13/700 muted, first and last header cells radius 12. Rows ≥ 52 px, divider `border`, numbers right-aligned and tabular, first column `<th scope="row">`. Total row bold in `<tfoot>`. Wrapped in `overflow-x: auto` (min width 820). |
| **Badge** | Pill height 24, padding 0 10, 13/700, tint fill + full-colour text. Risk: Tinggi → danger, Sedang → warning, Rendah → success. DQ status: Diperbaiki → success, Perlu konfirmasi → warning, Lolos cek → `surface-muted` + muted text, Gagal → danger. |
| **DqStatCard** | Like KpiCard without the icon; value `stat`. |
| **AliasRow** | Grid: raw spelling in `mono` on `surface-muted` (whitespace preserved so `HAULING ` shows its trailing space), arrow icon, canonical name (600), "n baris" right. |
| **KpiDefinition** | Card: `h3` name, formula in a `mono` block (`surface-muted`, radius 12), one-paragraph note. |
| **Banner** | Full-width inside the shell, radius 14, tint of `warning` or `info`, icon + one sentence + optional link. Used for "Ada pemeriksaan data yang gagal" and "Belum ada data". |
| **Skeleton** | Same shape as the block it replaces, `surface-muted` with a subtle pulse (none with reduced motion); shown after 300 ms. |
| **EmptyState** | Icon 24, `h3`, one line, optional link. |

---

## 6. Pages

Each page lists route, PRD reference, data, and states. Copy is Indonesian.

### 6.1 `/` — Dashboard (UC-01 … UC-05, FR-10 … FR-19)

- Header: "Ringkasan HR Site" / "Absensi, lembur, dan turnover · {periode}".
- **KPI cards** (`getSummary`): Headcount akhir ("{n} keluar sejak {bulan awal} ({headcount awal})"), Turnover bulanan ("Rata-rata · tahunan {x}%", note in `danger`), Absenteeism rate ("Hari absen ÷ hari kerja terjadwal"), Biaya lembur {tahun} ("Rata-rata {n} jam/orang/bulan").
- **Row 2:** TrendChart (`getMonthly`, flex 2) + RiskList (`getDepartments`, flex 1).
- **Row 3:** BucketBars "Lembur vs keluar" (`getOvertimeLeave`), PairBars "Absen sebelum keluar" (`getAbsenceLeave`), CostDonut "Biaya lembur per departemen" (`getDepartments`).
- **Findings:** "3 temuan & rekomendasi" (`getFindings`) + disclaimer line "Hubungan di atas adalah korelasi, bukan sebab-akibat. Lihat batasan data di halaman Data Quality Log."
- **Table:** "Detail per departemen" + "Unduh CSV" secondary button (`/api/v1/export/departments.csv`).
- **Footer:** "Data dummy untuk portofolio · Sumber: E_site_employees ({n} baris) dan E_site_monthly ({clean} baris bersih dari {raw}) · Pipeline terakhir {tanggal}".
- When a department filter is active: the RiskList and table keep all departments but highlight the selected row with `soft`; KPI cards, trend, buckets, pair bars use the filter; the donut shows all departments with the selected segment emphasised.

### 6.2 `/data-quality` — Data Quality Log (UC-06, UC-07, FR-20 … FR-25)

- Header: "Data Quality Log" / "Pembersihan E_site_employees dan E_site_monthly · run terakhir {tanggal WIB}"; secondary button "Unduh log (CSV)"; theme toggle.
- **Summary row** (5 DqStatCards): Baris mentah 4.514 · Duplikat dihapus 20 · Baris bersih 4.494 · Departemen 16 → 6 · Lembur kosong 312.
- **Log masalah data**: DataTable with ID (`mono`), Tabel · kolom (`mono`), Masalah, Baris (right), Tindakan (muted), Status (Badge).
- **Row:** "Penyeragaman nama departemen" (AliasRows, non-canonical spellings with counts) + "Penanganan lembur kosong" (explanation, per-department bars, sensitivity box in `soft`, warning line "Perlu konfirmasi tim payroll sebelum dipakai untuk keputusan biaya.").
- **`#definisi` Definisi KPI**: 4 KpiDefinition cards (Turnover bulanan, Absenteeism rate, Biaya lembur, Tingkat keluar per kelompok), text from `content/kpi-definitions.ts`.
- **`#batasan` Batasan data**: numbered list from `content/limitations.ts` (PRD Appendix B).

### 6.3 States (both pages)

| State | Behaviour |
|---|---|
| Loading | Each block shows its skeleton; header and sidebar render immediately. |
| No data (no successful run) | Shell shows Banner (info): "Belum ada data. Jalankan pipeline untuk mengisi dashboard." All blocks show EmptyState. |
| Check failed | Banner (warning) on both pages: "Ada pemeriksaan data yang gagal. Lihat Data Quality Log." linking to the log. |
| Filter returns no rows | Blocks show "Tidak ada data untuk filter ini." with a link "Hapus filter". |
| Error | Block-level message "Data gagal dimuat." + "Coba lagi" button; page-level `error.tsx` for total failure. |

---

## 7. Copy and Formatting Rules

- Sentence case; no exclamation marks; buttons are verbs ("Unduh CSV", "Coba lagi", "Hapus filter").
- Department names exactly as `departments.name`; codes never shown to users except in the DQ page `mono` cells.
- Numbers (`id-ID`): `4.514`; `1,39%` (turnover, 2 decimals), `3,2%` (absenteeism, 1 decimal); `Rp 6,35 M` (miliar) on cards and donut, `Rp 2,41 M` in tables, full rupiah in tooltips and CSV; `30 jam`; ratios `2,9×`.
- Months: `Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des`; periods `Jan–Des 2025` (en dash).
- Timestamps: `8 Nov 2026, 16.50 WIB`.
- Findings: title states the pattern; body has the number and the comparison group; recommendation starts with a verb and names who or how often.
- Never use "menyebabkan"; use "berkaitan dengan", "lebih sering", "naik menjelang".

## 8. Cross-Cutting Rules

- **Accessibility:** WCAG 2.1 AA (RULES.md §7.2). Charts: `role="img"` + `aria-label` summary built from data, plus a visually hidden data table.
- **Responsive breakpoints:** `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Tables scroll horizontally below `lg`; card rows stack below `md`.
- **Motion:** 150 ms ease-out for hover/focus; chart enter animation 400 ms once; theme switch without transition flash (`disableTransitionOnChange`). Nothing animates with `prefers-reduced-motion: reduce`.
- **Dark mode:** same layout, tokens swap. Dark cards have no shadow; separation comes from `page` → `shell` → `surface` tone steps. Check every screen in both themes.
- **Print:** `@media print` forces the light theme, hides sidebar and filters, keeps cards unbroken (`break-inside: avoid`), so the dashboard prints to one A4 landscape page-set for interviews.

## 9. Mockup Reference

| Artboard | Shows |
|---|---|
| Dashboard · Terang | §6.1 in light theme, toggle working |
| Dashboard · Gelap | Same component in dark theme |
| Data Quality Log · Terang | §6.2 in light theme |
| Data Quality Log · Gelap | Same in dark theme |

Figures in the mockup equal `PRD.md` Appendix A. The mockup is a static prototype: filters are not wired; the theme toggle and sidebar links work.
