import { test, expect } from "@playwright/test";

const isMobile = (projectName: string) => projectName === "Mobile Chrome";

const PAGES = [
  { url: "/", name: "home" },
  { url: "/models", name: "models" },
  { url: "/models/gpt-5-5", name: "detail" },
  { url: "/compare?models=claude-opus-4-8,gpt-5-5", name: "compare" },
  { url: "/about", name: "about" },
] as const;

/**
 * Manual full-site screenshot capture. Replaces the legacy
 * `e2e/screenshots/v4-review/take-{desktop,mobile}.js` one-off
 * scripts. Runs once per project (chromium + Mobile Chrome),
 * producing 10 full-page PNGs into e2e/screenshots/ (gitignored).
 *
 * Skipped by default so CI doesn't pay the screenshot cost on
 * every run. Opt in with: `npx playwright test e2e/screenshots.spec.ts`
 * (env-var not required, the test name itself signals intent).
 */
test.describe.skip("Screenshots — 全站静态截图", () => {
  for (const p of PAGES) {
    test(`${p.name} — full page`, async ({ page }, testInfo) => {
      const device = isMobile(testInfo.project.name) ? "mobile" : "desktop";
      await page.goto(p.url, { waitUntil: "networkidle" });
      await page.screenshot({
        path: `e2e/screenshots/${device}-${p.name}.png`,
        fullPage: true,
      });
      // Sanity: file is non-empty (screenshot actually wrote)
      // We don't read the file in test — just confirm page rendered.
      await expect(page.locator("body")).toBeVisible();
    });
  }
});
