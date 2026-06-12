import { test, expect } from "@playwright/test";

test.describe("Compare Feature — 模型对比", () => {

  test("desktop: compare toggle visible on model rows", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/models");
    await page.waitForSelector("table");

    const compareButtons = page.locator("button[aria-label='加入对比'], button[aria-label='Add to compare']");
    await expect(compareButtons.first()).toBeVisible();
    const count = await compareButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // 截图
    await page.screenshot({ path: "e2e/screenshots/compare-desktop-buttons.png", fullPage: false });
  });

  test("mobile: compare toggle visible on mobile cards", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/models");
    await page.waitForSelector("[data-testid='mobile-model-card']");

    // Scope to mobile card to avoid matching hidden desktop buttons
    const firstCard = page.locator("[data-testid='mobile-model-card']").first();
    const compareBtn = firstCard.locator("button[aria-label='加入对比'], button[aria-label='Add to compare']");
    await expect(compareBtn).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/compare-mobile-buttons.png", fullPage: false });
  });

  test("desktop: select 2 models → compare bar → navigate to /compare", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/models");
    await page.waitForSelector("table");

    const compareButtons = page.locator("button[aria-label='加入对比'], button[aria-label='Add to compare']");
    await compareButtons.nth(0).click();
    await page.waitForTimeout(300);

    // CompareBar 出现
    await expect(page.locator("[data-testid='compare-bar']").last()).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/compare-bar-1-model.png", fullPage: false });

    await compareButtons.nth(1).click();
    await page.waitForTimeout(300);

    // 截图：列表页 + compare bar
    await page.screenshot({ path: "e2e/screenshots/compare-list-with-bar.png", fullPage: true });

    // 点击"开始对比"按钮
    const ctaButton = page.locator("[data-testid='compare-bar']").last().locator("button").last();
    await ctaButton.click();
    await page.waitForURL(/\/compare/);
    await page.waitForSelector("table");

    // 对比页标题
    await expect(page.locator("h1")).toContainText("模型对比");

    // 截图：对比页
    await page.screenshot({ path: "e2e/screenshots/compare-page-desktop.png", fullPage: true });

    // 验证对比表格
    const rowCount = await page.locator("table tbody tr").count();
    expect(rowCount).toBeGreaterThanOrEqual(10);
  });

  test("mobile: select 2 models → compare bar at top → navigate to /compare", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/models");
    await page.waitForSelector("[data-testid='mobile-model-card']");

    // Scope to mobile cards
    const cards = page.locator("[data-testid='mobile-model-card']");
    const btn0 = cards.nth(0).locator("button[aria-label='加入对比'], button[aria-label='Add to compare']");
    const btn1 = cards.nth(1).locator("button[aria-label='加入对比'], button[aria-label='Add to compare']");
    await btn0.click();
    await page.waitForTimeout(300);
    await btn1.click();
    await page.waitForTimeout(300);

    // 截图：移动端列表 + compare bar
    await page.screenshot({ path: "e2e/screenshots/compare-list-mobile.png", fullPage: true });

    // Mobile CompareBar
    const mobileBar = page.locator("[data-testid='compare-bar']").first();
    await expect(mobileBar).toBeVisible();

    // 点击对比按钮
    const ctaButton = mobileBar.locator("button").last();
    await ctaButton.click();
    await page.waitForURL(/\/compare/);
    await page.waitForSelector("table");

    // 截图：移动端对比页
    await page.screenshot({ path: "e2e/screenshots/compare-page-mobile.png", fullPage: true });

    await expect(page.locator("table")).toBeVisible();
  });

  test("/compare empty state — shows guidance", async ({ page }) => {
    await page.goto("/compare");
    await expect(
      page.locator("text=请至少选择 2 个模型进行对比").or(page.locator("text=Select at least 2"))
    ).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/compare-empty-state.png", fullPage: true });
  });

  test("/compare with ?models= shows comparison table", async ({ page }) => {
    await page.goto("/compare?models=claude-fable-5,claude-opus-4-8,gpt-5-5");
    await page.waitForSelector("table");

    // 验证模型卡片
    const modelCards = page.locator("a[href^='/models/']");
    const cardCount = await modelCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3);

    // 验证对比表格行数
    const rowCount = await page.locator("table tbody tr").count();
    expect(rowCount).toBeGreaterThanOrEqual(10);

    // 截图：3 模型对比
    await page.screenshot({ path: "e2e/screenshots/compare-3-models.png", fullPage: true });
  });

  test("compare page highlights best values", async ({ page }) => {
    await page.goto("/compare?models=claude-fable-5,claude-opus-4-8");
    await page.waitForSelector("table");

    // 最优值应该有 lime 高亮
    const bestCells = page.locator("table td.font-bold.text-accent-lime");
    const count = await bestCells.count();
    expect(count).toBeGreaterThanOrEqual(1);

    await page.screenshot({ path: "e2e/screenshots/compare-best-value-highlight.png", fullPage: true });
  });

  test("compare bar remove model works", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/models");
    await page.waitForSelector("table");

    const compareButtons = page.locator("button[aria-label='加入对比'], button[aria-label='Add to compare']");
    await compareButtons.nth(0).click();
    await page.waitForTimeout(300);
    await compareButtons.nth(1).click();
    await page.waitForTimeout(300);

    await expect(page.locator("[data-testid='compare-bar']").last()).toBeVisible();

    // 移除一个
    const removeButton = page.locator("[data-testid='compare-bar']").last().locator("button[aria-label='移除'], button[aria-label='Remove']").first();
    await removeButton.click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: "e2e/screenshots/compare-bar-after-remove.png", fullPage: false });
  });
});
