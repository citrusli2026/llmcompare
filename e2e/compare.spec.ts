import { test, expect } from "@playwright/test";

const SCREENSHOTS = "e2e/screenshots";
const isMobile = (projectName: string) => projectName === "Mobile Chrome";

test.describe("Compare Feature", () => {
  test("desktop: compare checkbox toggles and CompareBar appears", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // Click first compare checkbox (empty square)
    const firstCheckbox = page.locator('button[aria-label="加入对比"]').first();
    await expect(firstCheckbox).toBeVisible();
    await firstCheckbox.click();
    await page.waitForTimeout(300);

    // CompareBar should appear — desktop version is the hidden sm:block one
    const bar = page.locator('[data-testid="compare-bar"].hidden.sm\\:block');
    await expect(bar).toBeVisible();

    // Click second compare checkbox
    const secondCheckbox = page.locator('button[aria-label="加入对比"]').first();
    await secondCheckbox.click();
    await page.waitForTimeout(300);

    // Bar should show 2 models
    await expect(bar).toContainText("2");
    await expect(bar).toContainText("/ 3");

    await page.screenshot({ path: `${SCREENSHOTS}/compare-bar-desktop.png`, fullPage: false });
  });

  test("desktop: compare page renders with model data", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/compare?models=deepseek-v4-flash,claude-sonnet-4-6");
    await page.waitForLoadState("networkidle");

    // Title visible
    await expect(page.locator("h1").filter({ hasText: /对比|Compare/ })).toBeVisible();

    // Model names in header cards (use specific link selector to avoid table header)
    await expect(page.locator("a[href='/models/deepseek-v4-flash']")).toBeVisible();
    await expect(page.locator("a[href='/models/claude-sonnet-4-6']")).toBeVisible();

    // Table has rows
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(5);

    // Boolean rows (reasoning, image input, open weights) have Check/X icons
    const booleanRows = rows.filter({ has: page.locator("svg") });
    const count = await booleanRows.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: `${SCREENSHOTS}/compare-page-desktop.png`, fullPage: true });
  });

  test("desktop: compare page empty state", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/compare");
    await page.waitForLoadState("networkidle");

    // Should show empty state with back button (use specific class to target the CTA, not navbar)
    await expect(page.locator("a[href='/models'].bg-accent-violet")).toBeVisible();
  });

  test("desktop: compare checkbox selected state shows checkmark", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // Click first compare button
    const btn = page.locator('button[aria-label="加入对比"]').first();
    await btn.click();
    await page.waitForTimeout(300);

    // Button should now show "移除" label with checkmark
    const removeBtn = page.locator('button[aria-label="移除"]').first();
    await expect(removeBtn).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOTS}/compare-selected-state.png`, fullPage: false });
  });

  test("mobile: compare checkbox and CompareBar at bottom", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // Click compare checkbox inside mobile card (use data-testid to scope)
    const firstCard = page.locator('[data-testid="mobile-model-card"]').first();
    const firstCheckbox = firstCard.locator('button[aria-label="加入对比"]');
    await firstCheckbox.click();
    await page.waitForTimeout(300);

    // CompareBar should appear — mobile version is the sm:hidden one
    const bar = page.locator('[data-testid="compare-bar"].sm\\:hidden');
    await expect(bar).toBeVisible();

    // Click second card's compare button
    const secondCard = page.locator('[data-testid="mobile-model-card"]').nth(1);
    const secondCheckbox = secondCard.locator('button[aria-label="加入对比"]');
    await secondCheckbox.click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${SCREENSHOTS}/compare-bar-mobile.png`, fullPage: false });
  });

  test("mobile: compare page renders", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/compare?models=deepseek-v4-flash,claude-sonnet-4-6");
    await page.waitForLoadState("networkidle");

    // Title visible
    await expect(page.locator("h1").filter({ hasText: /对比|Compare/ })).toBeVisible();

    // Table visible
    await expect(page.locator("table")).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOTS}/compare-page-mobile.png`, fullPage: true });
  });
});
