import { test, expect } from "@playwright/test";

const SCREENSHOTS = "e2e/screenshots";
const isMobile = (projectName: string) => projectName === "Mobile Chrome";

test.describe("Home Page", () => {
  test("desktop view", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用测试");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("table")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOTS}/home-desktop.png`, fullPage: true });
  });

  test("sort by intelligence", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用测试");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const header = page.locator("th").nth(3);
    await header.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOTS}/home-sorted.png`, fullPage: true });
  });

  test("mobile view", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用测试");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("select")).toBeVisible();
    await expect(page.locator("table")).toBeHidden();
    await page.screenshot({ path: `${SCREENSHOTS}/home-mobile.png`, fullPage: true });
  });

  test("mobile sort interaction", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用测试");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const select = page.locator("select");
    await expect(select).toBeVisible();
    await select.selectOption("intelligence");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOTS}/home-mobile-sorted.png`, fullPage: true });
  });
});

test.describe("Product Detail", () => {
  test("first product page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const firstLink = page.locator("a[href^='/product/']").first();
    const href = await firstLink.getAttribute("href");
    await page.goto(href!);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${SCREENSHOTS}/product-detail.png`, fullPage: true });
  });
});

test.describe("Other Pages", () => {
  test("about page", async ({ page }) => {
    await page.goto("/about");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${SCREENSHOTS}/about.png`, fullPage: true });
  });

  test("models page", async ({ page }) => {
    await page.goto("/models");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${SCREENSHOTS}/models.png`, fullPage: true });
  });
});
