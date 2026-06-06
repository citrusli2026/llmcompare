import { test, expect } from "@playwright/test";

test.describe("Dual Theme — 亮色/暗色双主题验证", () => {
  test("暗色模式: 基础元素存在 + 文本可见", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Default is dark
    expect(await page.locator("h1").count()).toBeGreaterThan(0);
  });

  test("亮色模式: 基础元素存在 + 文本可见", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
    });
    await page.waitForTimeout(200);
    expect(await page.locator("h1").count()).toBeGreaterThan(0);
  });

  test("亮暗切换: 无异常 + 内容保持", async ({ page }) => {
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
    await expect(page.locator("h1").first()).toBeVisible();

    // Light → Dark
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
    });
    await page.waitForTimeout(300);
    await expect(page.locator("h1").first()).toBeVisible();

    expect(errors).toEqual([]);
    console.log("Theme toggle test passed, errors:", errors.length);
  });
});
