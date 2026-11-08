import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = ["/", "/data-quality"] as const;

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((t) => window.localStorage.setItem("hr-theme", t), theme);
}

for (const theme of ["light", "dark"] as const) {
  for (const path of PAGES) {
    test(`${path} renders and has no serious axe violations (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("html")).toHaveClass(new RegExp(theme));
      await page.waitForLoadState("networkidle");
      await expect(page.getByText("Data gagal dimuat.")).toHaveCount(0);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      await page.screenshot({ path: `test-results/screens/${path === "/" ? "dashboard" : "data-quality"}-${theme}.png`, fullPage: true });
    });
  }
}

test("dashboard shows the headline figures", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Ringkasan HR Site" })).toBeVisible();
  for (const label of ["Headcount akhir", "Turnover bulanan", "Absenteeism rate"]) {
    await expect(page.getByRole("heading", { name: label })).toBeVisible();
  }
  await expect(page.getByText(/temuan & rekomendasi/)).toBeVisible();
  await expect(page.getByText("korelasi, bukan sebab-akibat", { exact: false }).first()).toBeVisible();
});

test("filters change the numbers and the URL", async ({ page, isMobile }) => {
  test.skip(isMobile, "filter flow checked on desktop");
  await page.goto("/");
  const headcount = page.getByRole("heading", { name: "Headcount akhir" }).locator("..").locator("..").locator("p").first();
  const before = await headcount.textContent();
  await page.getByRole("combobox", { name: "Departemen" }).selectOption("hauling");
  await expect(page).toHaveURL(/dept=hauling/);
  await expect(headcount).not.toHaveText(before ?? "");
  await page.getByRole("combobox", { name: "Periode" }).selectOption({ index: 2 });
  await expect(page).toHaveURL(/from=2025-07&to=2025-12/);
});

test("theme toggle persists across reloads", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: /Ganti ke tema gelap/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("CSV download works", async ({ request }) => {
  const res = await request.get("/api/v1/export/departments.csv");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-disposition"]).toContain("departments-");
  expect((await res.text()).split("\n").length).toBeGreaterThan(6);
});

test("health endpoint is up", async ({ request }) => {
  expect(await (await request.get("/api/health")).json()).toMatchObject({ ok: true, db: "up" });
});
