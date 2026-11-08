# HR ANALYTICS — RULES.md

> **Revision 1.** Coding and implementation rules for `hr-analytics-site`. They apply to every human and AI agent contributing to the repository and are **non-negotiable**: every pull request must comply before merge.
>
> Based on `PRD.md`, `ARCHITECTURE.md`, `SCHEMA.md`, and `DESIGN.md` (Revision 1).
>
> **Rules for AI agents.** Implement only what `PRD.md` and `ARCHITECTURE.md` describe. Do not invent endpoints, tables, columns, KPIs, findings, colours, or environment variables. Never type a business number into UI code or copy — every figure comes from a query. If something is missing, stop and ask, or propose an addition to the relevant document in the same pull request.

---

## 1. Project Rules

1. **Raw is sacred.** `raw_employees` and `raw_monthly` are never updated or deleted by cleaning code. Cleaning reads raw and writes clean.
2. **One writer.** Only `pipeline/` writes to the database. `app/` and `lib/queries/` are read-only; no `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE` outside `pipeline/` and migrations.
3. **One definition per KPI.** The formulas in `PRD.md §8.2` are implemented once in `lib/domain/kpi.ts` (and mirrored in SQL in `lib/queries`). The UI text in `content/kpi-definitions.ts` must describe the same formula.
4. **Numbers come from data.** No hard-coded figures in components, findings, captions, `aria-label`s, or metadata. Findings are templates filled from query results.
5. **Reproducible.** The default seed must reproduce `PRD.md` Appendix A. A change that moves those figures needs a PRD update in the same PR.
6. **Honest analysis.** Wherever two groups are compared, the page shows the correlation disclaimer. Never write "menyebabkan" (causes) in findings.
7. **Dummy only.** No real company names, logos, people, or employee data in code, fixtures, screenshots, or seed files.

## 2. Core Principles

- **KISS.** One app, one database, a few scripts. No new framework, state library, queue, or service without an ADR in `ARCHITECTURE.md §12`.
- **Server first.** Server Components by default; `'use client'` only for theme toggle, filters, charts, and the mobile nav.
- **Explicit over magic.** No global mutable state; config read once in `lib/env.ts`.
- **DRY, but not clever.** Shared helpers live in `lib/domain`; duplicate a three-line JSX block rather than build an abstraction for two uses.

---

## 3. TypeScript and Code Style

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. No `any`; use `unknown` and narrow.
- ESLint (flat config, `next/core-web-vitals`, `@typescript-eslint/strict`) and Prettier; CI fails on warnings.
- `no-restricted-imports`: `app/**` and `components/**` may not import `pipeline/**` or `db/migrations/**`; `components/**` may not import `db/**` (data reaches components as props).

| Item | Convention | Example |
|---|---|---|
| Files | kebab-case | `department-table.tsx`, `overtime-leave.ts` |
| React components | PascalCase | `DepartmentTable` |
| Functions | camelCase, verb first | `getMonthly`, `formatPercent` |
| Query functions | `get<Thing>` in `lib/queries` | `getOvertimeLeave` |
| DB identifiers | snake_case (SCHEMA.md) | `ot_hours_3m_avg` |
| API JSON fields | snake_case | `turnover_pct` |
| Department codes | `SCHEMA.md §4.1` only | `plant_maint` |
| DQ codes | `DQ-NN` | `DQ-04` |
| Branches | `feat/…`, `fix/…`, `chore/…`, `docs/…` | `feat/overtime-bucket-chart` |
| Commits | Conventional Commits | `feat(dashboard): add cost donut` |

## 4. Data and Pipeline Rules (`pipeline/`)

- Use `@neondatabase/serverless` `Pool` with `DATABASE_URL_UNPOOLED`; the whole clean step runs in **one transaction**. On any error: `ROLLBACK`, set `dq_runs.status = 'failed'` in a separate statement, exit with code 1.
- The generator uses one seeded PRNG passed explicitly to every function (no `Math.random()`). Faker is seeded with the same seed.
- The generator must produce the exact defect counts in `PRD.md §7`; a unit test asserts them on the CSVs.
- Department normalisation: `lower(btrim(regexp_replace(value, '\s+', ' ', 'g')))`, then look up `department_aliases`. An unknown spelling aborts the run with the spelling in the error message.
- Duplicate handling: only exact duplicates are removed. Same `(employee_id, month)` with different values aborts the run.
- Overtime nulls become `0` with `ot_imputed = true`. Never impute with an average without a PRD change.
- Every fix and check writes one `dq_issues` row, even when `rows_affected = 0`.
- Money: compute in integers (rupiah). `ot_cost_idr = round(overtime_hours * base_salary_idr * 1.5 / 173)`.
- After `COMMIT`, call `/api/revalidate`. A failed revalidate prints a warning but does not fail the run.
- Logs: print counts and codes only. No full names in pipeline output (they are fake, but keep the habit).

## 5. Query Rules (`lib/queries/`)

- Read-only SQL via Drizzle (`db.select…`) or the `sql` tagged template. Never build SQL by string concatenation.
- Every exported query function: starts with `'use cache'`, calls `cacheTag('hr-data')` and `cacheLife('days')`, takes one typed `Filters` object, returns plain serialisable data (numbers, strings, ISO dates).
- Percentages are returned as numbers in percent units (`1.39`, not `0.0139`) with full precision; rounding happens in `format.ts`.
- Filters are parsed only by `parseFilters()` (`lib/domain/filters.ts`, zod). Unknown department codes or months outside the data range → validation error, never a silent default.
- When no successful run exists, queries return `null` and the UI shows the empty state; route handlers return `503 no_data`.

## 6. API Rules (`app/api/`)

- Route handlers are thin: parse filters → call one query function → shape JSON. No SQL in route files.
- `GET` only under `/api/v1`. The single `POST` is `/api/revalidate`, which compares the secret with `crypto.timingSafeEqual`.
- Errors use the envelope in `ARCHITECTURE.md §6.4`; messages in Bahasa Indonesia; no stack traces or SQL in responses.
- CSV: UTF-8 with BOM, comma separator, `Content-Disposition: attachment; filename="<name>-<from>-<to>.csv"`.
- Every new endpoint is added to `ARCHITECTURE.md §6` in the same PR.

## 7. Frontend Rules

### 7.1 Design
- Use only the tokens, components, and copy rules in `DESIGN.md`. No hex values, font sizes, or radii hard-coded in components; use Tailwind classes mapped to tokens (`bg-surface`, `text-muted`, `rounded-card`).
- Charts get colours from `lib/chart-theme.ts`, which reads the CSS variables for the active theme. Never pass a hex literal to Recharts.
- Every screen is checked in light **and** dark before merge (Playwright screenshots in both themes).

### 7.2 Accessibility (WCAG 2.1 AA)
- Real `<button>`, `<a>`, `<label>`, `<select>`, `<table>` with `<th scope>`. No clickable `<div>`.
- Visible focus ring on every interactive element (`DESIGN.md §3.6`); touch targets ≥ 44 × 44 px.
- Each chart has a text alternative: an `aria-label` summary built from the same data **and** a visually hidden `<table>` (or the visible table on the page) with the series values.
- Status and risk are never shown by colour alone: badge text is always present.
- Respect `prefers-reduced-motion` (disable chart animation).
- `axe` reports zero serious/critical violations on both pages in both themes.

### 7.3 Language and formatting
- All user-facing text in Bahasa Indonesia, from `content/*.ts` or component literals; no English labels.
- Numbers only through `lib/domain/format.ts`, which wraps `Intl.NumberFormat('id-ID')`:
  - integers `4.514`; percent `1,39%` (2 decimals for turnover, 1 for absenteeism); money `Rp 6,35 M` on cards (miliar, 2 decimals), `Rp 2.410.512.000` in tables and CSV-adjacent tooltips; hours `30 jam`.
  - dates `Jan 2025`, `8 Nov 2026, 16.50 WIB` (timezone `Asia/Jakarta`).

### 7.4 Performance
- Each data block in its own `<Suspense>` with a skeleton of the same shape.
- Recharts loaded only in chart components; no chart code on `/data-quality` except the small bar list (pure CSS).
- Images: none required. Fonts via `next/font` (self-hosted, `display: swap`).
- Target: Lighthouse desktop Performance ≥ 90, Accessibility ≥ 95.

### 7.5 Security
- No secrets in `NEXT_PUBLIC_*`. `DATABASE_URL` is read only in server code (`import 'server-only'` in `db/client.ts` and `lib/queries/*`).
- Security headers as in `ARCHITECTURE.md §10`, set in `next.config.ts`.
- Theme preference is the only thing stored in the browser.

---

## 8. Testing Rules

| Level | Tool | What |
|---|---|---|
| Unit | Vitest | `lib/domain/*`: KPI math, risk rule, formatting (`id-ID`), filter parsing, findings templating |
| Generator | Vitest | CSV row counts and exact defect counts (§7 of PRD) |
| Golden | Vitest + PGlite | Run migrations + pipeline on an in-process Postgres; assert every figure in `PRD.md` Appendix A (counts exact, rates ± 0.05 pp) |
| API | Vitest | Route handlers: filter validation, error envelope, CSV headers, revalidate secret |
| E2E | Playwright | Both pages render, filters change numbers and URL, theme toggle persists, CSV download works |
| Accessibility | `@axe-core/playwright` | Both pages × both themes, zero serious/critical |

**Mandatory (CI fails without them):**
- Golden-figure test passes on the default seed.
- Raw tables are unchanged after a pipeline run (row count and checksum).
- A pipeline failure leaves the previous clean data intact.
- An unknown department spelling aborts the run.
- No route handler writes to the database (test runs the API suite with a read-only role on PGlite).
- `TestNoHardcodedNumbers`: a lint rule/grep fails on digits inside JSX text in `components/dashboard/**` except in `aria-hidden` decoration.
- axe on both pages in both themes.

Coverage target: ≥ 90% lines in `lib/domain`, ≥ 80% in `pipeline/`.

## 9. Git, Pull Requests, and Deployment

- `main` is always deployable; Vercel deploys `main` to production and every PR to a preview URL.
- One concern per PR; the description lists PRD IDs (`FR-xx`) and includes light + dark screenshots for UI changes.
- CI order: install → lint → typecheck → unit → golden → build → Playwright against the preview URL.
- Migrations: a new SQL file per change; never edit a merged migration. Run `pnpm db:migrate` before merging a PR that needs it.
- Docs updated in the same PR when behaviour changes (`PRD.md`, `ARCHITECTURE.md`, `SCHEMA.md`, `DESIGN.md`).

## 10. Definition of Done

- [ ] Requirement ID(s) implemented as specified; no undocumented behaviour
- [ ] No hard-coded business numbers; formatting through `format.ts`
- [ ] Unit / golden / e2e tests added or updated and green
- [ ] Light and dark checked; axe clean
- [ ] Empty, loading, and error states present for every new data block
- [ ] Bahasa Indonesia copy complete and follows `DESIGN.md §7`
- [ ] Docs updated; `.env.example` updated if a variable was added
- [ ] Preview deployment opened and checked on desktop and phone width
