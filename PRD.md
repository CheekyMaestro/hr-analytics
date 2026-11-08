# HR ANALYTICS — PRD (Product Requirements Document)

> **Revision 1.** Requirements for **HR Analytics · Site Tambang**, a full-stack portfolio project by **Athayya Ari Rafeyfa Sajjida**: a one-page dashboard for absensi, lembur, and turnover at a mining site, plus a data quality log page. One repository, `hr-analytics-site` (Next.js 16 + Neon Postgres), deployed on Vercel.
>
> **Source of truth:** the project brief (row "HR analytics") and its 6 steps — see §14 for the mapping from each brief step to a requirement. The role context is the public job description of an HR staff position at a mining site (attendance recap, payroll and overtime administration, periodic HR reports). **No real company name, logo, or real employee data appears anywhere in the product.**
>
> Companion documents: `ARCHITECTURE.md`, `SCHEMA.md`, `RULES.md`, `DESIGN.md`. Visual reference: the mockup canvas "HR Analytics – Mockup Dashboard & Data Quality Log" (light and dark artboards).
>
> **Rules for AI agents.** Implement only what this PRD and `ARCHITECTURE.md` describe. Every number shown in the UI must come from the database through the queries defined in `ARCHITECTURE.md §6`. The **reference figures in Appendix A** are the expected output of the seeded dummy data and are asserted by tests; if your change moves them, stop and ask.

---

## 1. Project Overview

HR teams at a mining site produce the same monthly reports by hand: attendance recap, overtime hours and cost, and who left. The source data is messy (inconsistent department names, empty overtime cells, duplicate rows), and the questions that matter — *which department is at risk, and are overtime and absence related to people leaving?* — are rarely answered.

This project shows the full path a junior HR analyst would take:

1. **Clean** two raw tables and record every fix in a data quality log.
2. **Define** three KPIs precisely (turnover bulanan, absenteeism rate, biaya lembur per departemen).
3. **Build** a one-page dashboard (light and dark theme).
4. **Analyse** the relationship of overtime and absence with `left_this_month`.
5. **Write** 3 findings with recommendations.
6. **Document** KPI definitions and data limitations.

It is a portfolio piece: a recruiter or hiring manager opens one public link and sees the dashboard, the cleaning work behind it, and the reasoning — without logging in.

| Item | Value |
|---|---|
| Product name | HR Analytics |
| Subtitle in UI | Site Tambang · 2025 |
| Author (shown in sidebar and footer) | Athayya Ari Rafeyfa Sajjida |
| Repository | `hr-analytics-site` |
| Hosting | Vercel (Hobby plan is enough) |
| Database | Neon Serverless Postgres via the Vercel Marketplace integration |
| Data | Dummy only, generated with a fixed seed |
| UI language | Bahasa Indonesia (English not required) |

## 2. Problem Statement

- **Messy source data.** `E_site_employees` (400 rows) and `E_site_monthly` (4,514 rows) contain inconsistent department names, empty `overtime_hours`, and 20 duplicate rows. Any KPI computed on the raw data is wrong.
- **KPIs without definitions.** "Turnover" and "absensi" mean different things to different people; without a written formula, two reports disagree.
- **Reports that describe but don't explain.** A table of numbers does not tell HR which department needs attention or what to do.
- **Hiring signal.** The author needs one artefact that proves HR reporting, data cleaning, dashboard, and turnover analysis skills, reachable by link and readable in 2 minutes.

## 3. Project Goals

- **G1 — Clean, traceable data.** Every cleaning step is reproducible from the raw tables and logged with the number of rows affected.
- **G2 — Defined KPIs.** Turnover bulanan, absenteeism rate, and biaya lembur per departemen have one written formula each, shown in the UI and used by the code.
- **G3 — One-page dashboard.** KPI cards, monthly trend, department risk ranking, overtime-vs-leave and absence-vs-leave analysis, overtime cost split, findings, and a department table — all on one page, with light and dark themes.
- **G4 — Explained findings.** Exactly 3 findings, each with a number from the data and one concrete recommendation.
- **G5 — Honest limits.** A visible list of data limitations and the statement that relationships are correlations, not causes.
- **G6 — Zero-friction access.** Public, no login, loads fast on a laptop and is usable on a phone; deployable to Vercel by following the README.

## 4. Non-Goals

- No login, no user accounts, no roles. The site is public and read-only.
- No upload of real HR data. The app only reads the seeded dummy dataset. (A future "upload your own CSV" is listed in §13 as an open question, not in scope.)
- No payroll calculation beyond the simplified overtime-cost formula in §8.3.
- No predictive model (no machine learning "attrition score"). The analysis is descriptive: rates per group and a simple correlation.
- No editing of data from the UI. The cleaning pipeline runs from the command line.
- No English UI.
- No real company name, logo, or brand. "Site Tambang" is a generic label.

---

## 5. Target Users

| Persona | Uses the site to… | What they need |
|---|---|---|
| **Recruiter / HR hiring manager** (primary) | Judge the author's skills in under 2 minutes | Clear headline numbers, readable findings, visible cleaning work |
| **HR site staff** (the persona the dashboard is designed for) | See monthly absensi, lembur, and turnover; find the risky department | Filters by period and department, a department table, CSV export |
| **Technical reviewer** | Check that the work is real and reproducible | Data quality log, KPI formulas, link to the repository, deterministic seed |
| **The author** | Present the project in an interview | Light/dark toggle, stable numbers that match the slides |

## 6. Core Concepts

| Concept | Definition |
|---|---|
| **Employee** | One row of `E_site_employees`: `employee_id`, name (fake), department, job level, hire date, base salary. |
| **Employee-month** | One row of `E_site_monthly`: an employee's attendance, overtime, and leave flag for one calendar month. |
| **Raw data** | The two tables exactly as generated, including the injected defects. Never modified. |
| **Clean data** | Raw data after the cleaning pipeline (§8.1). All KPIs use clean data only. |
| **Department (baku)** | One of 6 canonical names: Hauling, Mining Operations, Plant & Maintenance, HSE, HR & GA, Finance. |
| **Department alias** | A raw spelling mapped to a canonical department (e.g. `HAULING ` → Hauling). |
| **Leaver** | An employee with `left_this_month = 1` in exactly one month. That month is the last row for the employee. |
| **Headcount (month m)** | Number of distinct employees with a clean row in month m (includes leavers of month m). |
| **Data quality issue** | A logged check with an ID (`DQ-01` …), the table/column, rows affected, the action taken, and a status. |
| **Pipeline run** | One execution of the cleaning pipeline; it writes a `dq_runs` row and refreshes all aggregates. |
| **Risk level** | Tinggi / Sedang / Rendah per department, from the rule in §8.4. |

## 7. Data Sources (dummy)

Both tables are generated by `scripts/generate.ts` with a fixed seed (`SEED=20251231`). Same seed → identical CSVs, byte for byte.

### 7.1 `E_site_employees` — 400 rows

| Column | Type | Notes |
|---|---|---|
| `employee_id` | text | `EMP0001` … `EMP0400`, unique |
| `full_name` | text | Fake Indonesian names (Faker, locale `id_ID`) |
| `department` | text | **Dirty:** 97 rows use a non-canonical spelling |
| `job_level` | text | `Operator`, `Staff`, `Supervisor`, `Superintendent`, `Manager` |
| `hire_date` | date | Between 2012-01-01 and 2024-12-31 |
| `base_salary` | integer (IDR / month) | Used only for overtime cost |
| `employment_type` | text | `PKWT` (contract) or `PKWTT` (permanent) |

### 7.2 `E_site_monthly` — 4,514 rows

| Column | Type | Notes |
|---|---|---|
| `employee_id` | text | Must exist in employees |
| `month` | date | First day of month, 2025-01-01 … 2025-12-01 |
| `department` | text | **Dirty:** 1,126 rows use a non-canonical spelling (10 alias spellings) |
| `work_days` | integer | Scheduled working days from the roster (20–26) |
| `absent_days` | integer | Unplanned absence; 0 ≤ `absent_days` ≤ `work_days` |
| `overtime_hours` | numeric | **Dirty:** 312 empty values |
| `left_this_month` | 0 / 1 | 1 in the employee's last month only |

**Injected defects (exact counts):** 10 non-canonical department spellings (16 spellings in total for 6 departments), 1,126 dirty department rows in monthly and 97 in employees, 312 empty `overtime_hours`, 20 exact duplicate rows. Checks DQ-05 … DQ-08 must find **0** violations — the generator must not create them.

**Injected patterns (so the analysis has something to find):** Hauling has the highest turnover, absence, and overtime; higher overtime raises the monthly leave probability; absence rises in the 3 months before leaving. Exact expected values are in Appendix A.

---

## 8. Business Rules

### 8.1 Cleaning pipeline (in this order)

1. **Load raw** CSVs into `raw_employees` and `raw_monthly` unchanged.
2. **Standardise department**: trim, collapse inner spaces, lower-case, then look up `department_aliases`. An unknown spelling stops the run (no silent "Other").
3. **Remove exact duplicates** in monthly: same `employee_id` + `month` and all other columns equal → keep one. Same key with *different* values → stop the run and log it (none expected).
4. **Empty overtime**: set to 0, set `ot_imputed = true`.
5. **Validation checks** DQ-05 … DQ-08 (absent > work days; more than one leave flag; rows after the leave month; unknown employee). Any violation → status `Gagal`, run continues, dashboard shows a warning banner.
6. **Write clean tables**, the data quality log, and refresh aggregates in one transaction.

### 8.2 KPI definitions (shown verbatim on the Data Quality Log page)

| KPI | Formula | Notes |
|---|---|---|
| **Turnover bulanan** | leavers in month m ÷ headcount in month m × 100% | Period figure = average of monthly values. **Turnover tahunan** = total leavers ÷ average monthly headcount × 100%. |
| **Absenteeism rate** | Σ `absent_days` ÷ Σ `work_days` × 100% | Approved annual leave is not counted as absence (it is not in `absent_days`). |
| **Biaya lembur** | Σ `overtime_hours` × (`base_salary` ÷ 173) × 1.5 | Simplification: every overtime hour is paid 1.5× the hourly wage (÷173 is the standard monthly-to-hourly divisor). Grouped per department and month. |
| **Leave rate per group** | rows with `left_this_month = 1` ÷ all rows in the group × 100% | Overtime group uses the employee's average overtime of the last 3 months (including the current month). |
| **Absence before leaving** | absenteeism rate of leavers over their last 3 months vs absenteeism rate of employees who stayed all 12 months | |

### 8.3 Analysis rules

- Overtime buckets: `≤ 20`, `20–40`, `> 40` hours/month (3-month rolling average). A row with `ot_imputed = true` counts as 0 hours.
- Also report the point-biserial correlation (r) between `left_this_month` and (a) rolling overtime, (b) rolling absenteeism. Shown as small text, never as the headline.
- **Sensitivity check:** recompute the bucket ratio excluding `ot_imputed` rows and show it on the Data Quality Log page.
- Every finding and chart caption that compares groups must say "korelasi, bukan sebab-akibat" somewhere on the page.

### 8.4 Department risk level

| Level | Rule (period average) |
|---|---|
| **Tinggi** | turnover bulanan ≥ 1.5× site average **or** (turnover ≥ 1.2× site **and** absenteeism ≥ 1.2× site) |
| **Sedang** | turnover ≥ 0.85× site average |
| **Rendah** | otherwise |

Badges always show the label text, never colour alone.

### 8.5 Findings

Exactly 3 findings, stored in `content/findings.ts` as templates whose numbers are filled from query results (no hard-coded numbers in text). Each has: number, title, body (with at least one figure), recommendation (one action, one owner or frequency).

---

## 9. Use Cases

### UC-01: See the site at a glance
A recruiter opens the root URL. Within the first screen they see 4 KPI cards (headcount akhir, turnover bulanan, absenteeism rate, biaya lembur), the monthly trend chart, and the department risk list.

### UC-02: Filter by period and department
HR staff choose a period (Jan–Des, Jan–Jun, Jul–Des 2025, or a custom month range) and a department. All cards, charts, and the table update. The filter is kept in the URL so the link can be shared.

### UC-03: Find the risky department
The user reads "Risiko per departemen", sorted by turnover, with a Tinggi/Sedang/Rendah badge, and the detail table below it.

### UC-04: Check overtime and absence against leaving
The user reads "Lembur vs keluar" (3 buckets with leave rates and row counts) and "Absen sebelum keluar" (leavers vs stayers).

### UC-05: Read findings and recommendations
The user reads 3 finding cards with a number and a recommendation each.

### UC-06: Inspect the cleaning work
From the sidebar, the user opens Data Quality Log: summary numbers (4,514 → 4,494), the issue log table, the department mapping, overtime-null handling with the sensitivity check.

### UC-07: Read KPI definitions and data limits
On the Data Quality Log page, the user reads the 4 KPI definitions and 6 data limitations.

### UC-08: Download data
The user downloads the clean monthly table, the department summary, or the issue log as CSV.

### UC-09: Switch theme
The user switches between Terang and Gelap; the choice is remembered on that browser. Default follows the operating system.

### UC-10: Reproduce the data (developer)
A developer clones the repo, connects a Neon database, runs `pnpm db:setup`, and gets exactly the figures in Appendix A.

---

## 10. Functional Requirements

### Data and pipeline
| ID | Requirement |
|---|---|
| FR-01 | Deterministic dummy-data generator producing the two CSVs in §7 with the exact row counts and defect counts. |
| FR-02 | Loader writes the CSVs into `raw_employees` / `raw_monthly` unchanged (all columns as text). |
| FR-03 | Cleaning pipeline per §8.1, in one database transaction; failure rolls back and leaves the previous clean data in place. |
| FR-04 | Department alias table seeded from `data/department_aliases.csv`; unknown spellings stop the run. |
| FR-05 | Data quality log: one row per check per run (ID, table, column, description, rows affected, action, status). |
| FR-06 | Aggregates (monthly × department, overtime buckets, absence-before-leave, correlations) refreshed at the end of each run. |
| FR-07 | After a successful run, the pipeline triggers cache revalidation of the deployed site (`POST /api/revalidate` with a secret). |

### Dashboard (`/`)
| ID | Requirement |
|---|---|
| FR-10 | 4 KPI cards: Headcount akhir, Turnover bulanan (with tahunan), Absenteeism rate, Biaya lembur. |
| FR-11 | Line chart: turnover bulanan and absenteeism per month; highlight the highest turnover month with a label. |
| FR-12 | "Risiko per departemen" list sorted by turnover with risk badge (§8.4). |
| FR-13 | "Lembur vs keluar" bar list (3 buckets: rate, leavers, rows) and the ratio of highest to lowest bucket. |
| FR-14 | "Absen sebelum keluar" comparison (leavers vs stayers) with counts. |
| FR-15 | Donut of biaya lembur per departemen with total in the centre and a legend with value and %. |
| FR-16 | 3 findings with recommendations (§8.5) and the correlation disclaimer. |
| FR-17 | Department detail table: headcount awal, keluar, turnover/bln, absenteeism, lembur/orang/bulan, biaya lembur, risiko; total row. |
| FR-18 | Filters: period (preset + custom month range) and department; reflected in the URL query (`?from=2025-01&to=2025-12&dept=hauling`). |
| FR-19 | Every chart has a text alternative (`aria-label` summary or a visually hidden table). |

### Data Quality Log (`/data-quality`)
| ID | Requirement |
|---|---|
| FR-20 | Summary cards: baris mentah, duplikat dihapus, baris bersih, departemen (16 → 6), lembur kosong. |
| FR-21 | Issue log table from the latest run (DQ-01 … DQ-08) with status badge: Diperbaiki / Perlu konfirmasi / Lolos cek / Gagal. |
| FR-22 | Department mapping: each alias, canonical name, rows affected. |
| FR-23 | Overtime-null panel: count, % of rows, split per department, sensitivity result. |
| FR-24 | KPI definitions (§8.2) and data limitations list (Appendix B). |
| FR-25 | "Run terakhir" timestamp in WIB. |

### API and export
| ID | Requirement |
|---|---|
| FR-30 | Read-only JSON API under `/api/v1` (list in `ARCHITECTURE.md §6`), same filters as the UI. |
| FR-31 | CSV export: clean monthly rows, department summary, DQ log. UTF-8 with BOM so Excel opens it correctly. |
| FR-32 | `GET /api/health` returns database reachability and the latest run ID. |

### Global
| ID | Requirement |
|---|---|
| FR-40 | Light and dark themes; toggle in the header; default = system; remembered per browser. |
| FR-41 | Sidebar with Dashboard, Data Quality Log, Definisi KPI, Unduh data bersih; author card. |
| FR-42 | Banner "Data dummy" visible on every page footer. |
| FR-43 | Responsive: sidebar stacks above content below 768 px; tables scroll horizontally. |

## 11. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | **Performance:** dashboard LCP < 2.5 s on desktop broadband; server queries < 300 ms p95 (aggregates are precomputed). |
| NFR-02 | **Accessibility:** WCAG 2.1 AA (contrast, focus, keyboard, chart alternatives). |
| NFR-03 | **Reproducibility:** same seed → same CSVs → same figures (Appendix A), checked in CI. |
| NFR-04 | **Cost:** runs on Vercel Hobby and Neon Free plan. No paid service required. |
| NFR-05 | **Privacy:** only fake data; no analytics cookies; no personal data collected from visitors. |
| NFR-06 | **Maintainability:** TypeScript strict, one repository, documented in these 5 files and the README. |
| NFR-07 | **Language:** all UI text in Bahasa Indonesia; numbers in Indonesian format (`1.234`, `3,2%`, `Rp 6,35 M`). |

## 12. Success Metrics

| Metric | Target |
|---|---|
| Time for a recruiter to state the main finding after opening the link | < 2 minutes |
| Lighthouse (desktop) Performance / Accessibility | ≥ 90 / ≥ 95 |
| Appendix A figures reproduced from a clean clone | 100% |
| Pages with both themes visually checked | 2 / 2 |
| Deploy from fresh clone to live Vercel URL following README | < 20 minutes |

## 13. Open Questions

1. **Custom upload.** Should a later version let a visitor upload their own two CSVs (processed in memory, not stored)? Not in this revision.
2. **Overtime multiplier.** The 1.5× flat rate simplifies the real rule (first hour 1.5×, next hours 2×). Keep the simplification, or model it per hour? Current answer: keep, and say so in the definitions.
3. **Period.** Only 2025. Add 2024 to show seasonality? Would change Appendix A.
4. **Leave reasons.** Add `exit_reason` (resign / habis kontrak / PHK) to make turnover voluntary vs involuntary? Would add one finding.
5. **Repository link.** Show a "Lihat kode di GitHub" button in the sidebar? Needs the final repo URL.

## 14. Brief → Requirement Mapping

| Brief step | Covered by |
|---|---|
| 1. Bersihkan: seragamkan nama departemen, hapus duplikat, tangani overtime kosong; catat di data quality log | §8.1, FR-03 … FR-05, FR-20 … FR-23 |
| 2. Definisikan KPI: turnover bulanan, absenteeism rate, biaya lembur per departemen | §8.2, FR-24 |
| 3. Bangun dashboard 1 halaman | FR-10 … FR-19 (web instead of Excel/Looker Studio; CSV export keeps Excel use possible) |
| 4. Analisis hubungan lembur/absen dengan `left_this_month` | §8.3, FR-13, FR-14 |
| 5. 3 temuan + rekomendasi | §8.5, FR-16 |
| 6. Tulis definisi KPI dan batasan data | FR-24, Appendix B |
| Output: 1 halaman dashboard + 1 halaman data quality log | `/` and `/data-quality` |

---

## Appendix A — Reference Figures (seed `20251231`, full year 2025, all departments)

Tests assert counts exactly and rates within ±0.05 percentage points.

| Figure | Value |
|---|---|
| Raw monthly rows / duplicates / clean rows | 4,514 / 20 / 4,494 |
| Employees | 400 |
| Leavers (total) | 62 |
| Headcount Jan → akhir Des | 400 → 338 |
| Leavers per month Jan … Des | 3, 4, 4, 5, 5, 6, 7, 6, 4, 5, 5, 8 |
| Turnover bulanan Jan … Des (%) | 0.75, 1.01, 1.02, 1.29, 1.30, 1.58, 1.88, 1.64, 1.11, 1.40, 1.42, 2.31 |
| Turnover bulanan (average) / tahunan | 1.39% / 16.6% |
| Absenteeism Jan … Des (%) | 2.9, 3.0, 3.1, 3.3, 3.2, 3.4, 3.6, 3.5, 3.1, 3.0, 3.2, 3.5 |
| Absenteeism rate (period) | 3.2% |
| Biaya lembur 2025 | Rp 6,35 M (Rp 6.35 billion) |
| Average overtime | 30 hours / employee / month |
| Overtime empty rows | 312 (6.9%) |
| Dirty department rows (monthly / employees) | 1,126 / 97 |

| Department | Headcount Jan | Leavers | Turnover/bln | Absenteeism | OT h/org/bln | Biaya lembur | Risk |
|---|---:|---:|---:|---:|---:|---:|---|
| Hauling | 120 | 26 | 2.02% | 4.1% | 41 | Rp 2,41 M | Tinggi |
| Mining Operations | 110 | 17 | 1.40% | 3.4% | 33 | Rp 1,86 M | Sedang |
| Plant & Maintenance | 80 | 11 | 1.23% | 3.0% | 30 | Rp 1,32 M | Sedang |
| HSE | 35 | 4 | 1.01% | 2.2% | 18 | Rp 0,39 M | Rendah |
| Finance | 25 | 2 | 0.69% | 1.8% | 8 | Rp 0,15 M | Rendah |
| HR & GA | 30 | 2 | 0.57% | 2.0% | 10 | Rp 0,22 M | Rendah |

| Overtime bucket (3-mo avg) | Rows | Leavers | Leave rate / month |
|---|---:|---:|---:|
| ≤ 20 h | 1,650 | 13 | 0.79% |
| 20–40 h | 1,780 | 25 | 1.40% |
| > 40 h | 1,064 | 24 | 2.26% |
| Ratio > 40 vs ≤ 20 | | | 2.9× (2.8× excluding imputed rows) |

| Absence before leaving | Value |
|---|---|
| Leavers, last 3 months | 6.8% |
| Stayers (all 12 months) | 2.9% |

## Appendix B — Data Limitations (shown in the UI)

1. All data is dummy, generated with a fixed seed; patterns were injected on purpose for analysis practice.
2. Only 12 months (Jan–Dec 2025), so seasonality cannot be confirmed.
3. No new hires in the period; headcount only falls through leavers.
4. Leave reason (resign, end of contract, termination) is not available; all leavers count the same.
5. 312 empty overtime values are assumed to be 0; overtime cost may be understated.
6. Relationships between overtime/absence and leaving are correlations, not proof of cause.
