import { test, expect } from "@playwright/test";

const SCREENSHOTS = "e2e/screenshots";

test.describe("Home Page", () => {
  test("desktop view", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("table")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOTS}/home-desktop.png`, fullPage: true });
  });

  test("sort by intelligence", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const header = page.locator("th").nth(3);
    await header.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOTS}/home-sorted.png`, fullPage: true });
  });

  test("mobile view", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("select")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOTS}/home-mobile.png`, fullPage: true });
  });
});

test.describe("Product Detail", () => {
  test("first product page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const firstLink = page.locator("a[href^='/product/']").first();
    await firstLink.click();
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
