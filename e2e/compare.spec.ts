import { test, expect } from "@playwright/test";

const isMobile = (projectName: string) => projectName === "Mobile Chrome";

test.describe("Compare Feature — 模型对比功能", () => {
  test("desktop: 表格行复选框加入对比", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 第一行第一个 button（即对比复选框）
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();

    const firstBtn = rows.first().locator("button").first();
    await firstBtn.click();
    await page.waitForTimeout(300);

    // CompareBar 应出现（fixed bottom-0）
    const bar = page.locator("div.fixed.bottom-0");
    await expect(bar).toBeVisible();
  });

  test("desktop: CompareBar 显示已选模型 + 跳转对比页", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 选两个模型
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(1);

    await rows.nth(0).locator("button").first().click();
    await page.waitForTimeout(200);
    await rows.nth(1).locator("button").first().click();
    await page.waitForTimeout(200);

    // CompareBar 可见
    const bar = page.locator("div.fixed.bottom-0");
    await expect(bar).toBeVisible();

    // bar 内应有对比按钮 — 文本格式为 "对比 (2)" / "Compare (2)"
    const compareBtn = page.locator("div.fixed.bottom-0 button:has(svg.lucide-arrow-right)");
    await expect(compareBtn).toBeVisible();

    // 点击跳转到对比页
    await compareBtn.click();
    await page.waitForURL("**/compare?models=*");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/compare?models=");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("mobile: 卡片复选框 + CompareBar 出现", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 找到卡片区域的对比按钮（mobile card 有 relative class，StatsStrip 没有）
    const mobileCard = page.locator("div.relative.rounded-xl.border").first();
    const addBtn = mobileCard.locator("button").first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await page.waitForTimeout(300);

    // CompareBar 出现
    const bar = page.locator("div.fixed.bottom-0");
    await expect(bar).toBeVisible();
  });

  test("mobile: 从 CompareBar 跳转对比页", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 找到卡片区域的对比按钮
    const mobileCard = page.locator("div.relative.rounded-xl.border").first();
    const addBtn = mobileCard.locator("button").first();
    await addBtn.click();
    await page.waitForTimeout(300);

    // CompareBar 中的对比按钮 — 带 ArrowRight 图标的按钮
    const bar = page.locator("div.fixed.bottom-0");
    await expect(bar).toBeVisible();

    const compareBtn = bar.locator("button:has(svg.lucide-arrow-right)");
    await expect(compareBtn).toBeVisible();
    await compareBtn.click();
    await page.waitForURL("**/compare?models=*");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/compare?models=");
  });
});
