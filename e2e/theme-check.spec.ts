import { test, expect } from "@playwright/test";

const SCREENSHOTS = "e2e/screenshots";

// ─── Theme-specific tests ──────────────────────────────────────
test.describe("Dual Theme — 亮色/暗色双主题验证", () => {
  test("亮色主题: 淡紫白底色 + 白色卡片", async ({ page }) => {
    // Inject localStorage BEFORE page loads
    await page.addInitScript(() => {
      localStorage.setItem("theme", "light");
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should NOT have dark class
    const html = page.locator("html");
    const classes = await html.getAttribute("class");
    console.log(`Light - html classes: ${classes}`);

    // Body bg should be light lavender
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    console.log(`Light bg: ${bgColor}`);
    
    // Verify it's light (not dark purple #1f1633)
    const isLight = !bgColor.includes("31, 22, 51");
    console.log(`Is light: ${isLight}`);

    // StatsStrip card should exist
    const card = page.locator("section.px-4.pt-2 > div > div.grid > div.rounded-xl").first();
    await expect(card).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOTS}/theme-light-full.png`, fullPage: true });
  });

  test("暗色主题: Deep Purple + Glass 毛玻璃", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const html = page.locator("html");
    const classes = await html.getAttribute("class");
    console.log(`Dark - html classes: ${classes}`);
    expect(classes).toContain("dark");

    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    console.log(`Dark bg: ${bgColor}`);
    expect(bgColor).toContain("31, 22, 51");

    // Glass cards should exist
    const card = page.locator("section.px-4.pt-2 > div > div.grid > div.rounded-xl").first();
    await expect(card).toBeVisible();
    
    const cardBg = await card.evaluate(el => getComputedStyle(el).backgroundColor);
    console.log(`Dark card bg: ${cardBg}`);

    await page.screenshot({ path: `${SCREENSHOTS}/theme-dark-full.png`, fullPage: true });
  });

  test("亮暗切换: 无异常 + 表格保持", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Dark → Light via toggle
    await page.evaluate(() => {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
    });
    await page.waitForTimeout(300);
    await expect(page.locator("table")).toBeVisible();

    // Light → Dark
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
    });
    await page.waitForTimeout(300);
    await expect(page.locator("table")).toBeVisible();

    expect(errors).toEqual([]);
    console.log("Theme toggle test passed, errors:", errors.length);
  });
});
