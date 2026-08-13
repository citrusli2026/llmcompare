import { test, expect } from "@playwright/test";

const SCREENSHOTS = "e2e/screenshots";
const isMobile = (projectName: string) => projectName === "Mobile Chrome";

test.describe("Compare Feature", () => {
  test("desktop: compare mode toggle activates selection", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");

    // No per-row compare buttons visible
    const checkboxes = page.locator('button[aria-label="加入对比"]');
    await expect(checkboxes).toHaveCount(0);

    // Click compare mode toggle button
    const toggleBtn = page.locator("button").filter({ hasText: /对比|Compare/ }).first();
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await page.waitForTimeout(300);

    // CompareBar should appear at bottom
    const bar = page.locator('[data-testid="compare-bar"]').nth(1); // desktop = hidden sm:block
    await expect(bar).toBeVisible();

    // Click first model row to select
    const firstRow = page.locator("tbody tr").first();
    await firstRow.click();
    await page.waitForTimeout(300);

    // Row should have purple ring highlight
    await expect(firstRow).toHaveClass(/ring-accent-violet/);

    // Click second row
    const secondRow = page.locator("tbody tr").nth(1);
    await secondRow.click();
    await page.waitForTimeout(300);

    // Bar should show 2 models and compare CTA
    await expect(bar).toContainText("2");
    await expect(bar).toContainText("/ 3");

    await page.screenshot({ path: `${SCREENSHOTS}/compare-mode-desktop.png`, fullPage: false });
  });

  test("desktop: compare page renders with model data", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/compare?models=deepseek-v4-flash,claude-sonnet-4-6");

    // Title visible
    await expect(page.locator("h1").filter({ hasText: /对比|Compare/ })).toBeVisible();

    // Model names in header cards
    await expect(page.locator("a[href='/models/deepseek-v4-flash']")).toBeVisible();
    await expect(page.locator("a[href='/models/claude-sonnet-4-6']")).toBeVisible();

    // Table has rows
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(5);

    await page.screenshot({ path: `${SCREENSHOTS}/compare-page-desktop.png`, fullPage: true });
  });

  test("desktop: compare page empty state", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/compare");

    // Should show empty state with back button
    await expect(page.locator("a[href='/models'].bg-accent-violet")).toBeVisible();
  });

  test("mobile: compare mode toggle and selection", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/models");

    // Click compare mode toggle
    const toggleBtn = page.locator("button").filter({ hasText: /对比|Compare/ }).first();
    await toggleBtn.click();
    await page.waitForTimeout(300);

    // CompareBar should appear
    const bar = page.locator('[data-testid="compare-bar"]').first(); // mobile = sm:hidden
    await expect(bar).toBeVisible();

    // Click first card
    const firstCard = page.locator('[data-testid="mobile-model-card"]').first();
    await firstCard.click();
    await page.waitForTimeout(300);

    // Card should have purple ring
    await expect(firstCard).toHaveClass(/ring-accent-violet/);

    // Click second card
    const secondCard = page.locator('[data-testid="mobile-model-card"]').nth(1);
    await secondCard.click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${SCREENSHOTS}/compare-mode-mobile.png`, fullPage: false });
  });

  test("mobile: compare page renders", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/compare?models=deepseek-v4-flash,claude-sonnet-4-6");

    // Title visible
    await expect(page.locator("h1").filter({ hasText: /对比|Compare/ })).toBeVisible();

    // Table visible
    await expect(page.locator("table")).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOTS}/compare-page-mobile.png`, fullPage: true });
  });
});
