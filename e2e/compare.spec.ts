import { test, expect } from "@playwright/test";

const isMobile = (projectName: string) => projectName === "Mobile Chrome";

test.describe("Compare Feature — 模型对比功能", () => {
  test("desktop: 表格行复选框加入对比", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 第一行复选框点击
    const firstCheckbox = page.locator("tbody tr").first().locator("button[aria-label*='compare.addToCompare']");
    await expect(firstCheckbox).toBeVisible();
    await firstCheckbox.click();
    await page.waitForTimeout(300);

    // 复选框变为选中状态
    const checked = page.locator("tbody tr").first().locator("button[aria-label*='compare.remove']");
    await expect(checked).toBeVisible();
  });

  test("desktop: CompareBar 显示已选模型", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 选中两个模型
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    const btn0 = rows.nth(0).locator("button[aria-label*='compare.addToCompare']");
    await btn0.click();
    await page.waitForTimeout(200);

    if (count > 1) {
      const btn1 = rows.nth(1).locator("button[aria-label*='compare.addToCompare']");
      await btn1.click();
      await page.waitForTimeout(200);
    }

    // CompareBar 应出现（fixed bottom bar）
    const bar = page.locator("div.fixed.bottom-0");
    await expect(bar).toBeVisible();
  });

  test("desktop: CompareBar 跳转到对比页", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 选中两个模型
    const rows = page.locator("tbody tr");
    const btn0 = rows.nth(0).locator("button[aria-label*='compare.addToCompare']");
    await btn0.click();
    await page.waitForTimeout(200);

    const btn1 = rows.nth(1).locator("button[aria-label*='compare.addToCompare']");
    await btn1.click();
    await page.waitForTimeout(200);

    // 点击对比按钮
    const compareBtn = page.locator("div.fixed.bottom-0").getByRole("button", { name: /compare.compareNow/ });
    await compareBtn.click();
    await page.waitForLoadState("networkidle");

    // 跳转到对比页
    expect(page.url()).toContain("/compare?models=");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("mobile: 卡片复选框加入对比", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 移动端卡片上的对比按钮
    const firstCard = page.locator("a[href^='/product/']").first();
    await expect(firstCard).toBeVisible();

    // 找到卡片内的对比按钮（不在 <a> 内）
    const compareBtn = page.locator("button[aria-label*='compare.addToCompare']").first();
    await expect(compareBtn).toBeVisible();
    await compareBtn.click();
    await page.waitForTimeout(300);

    // 变为已选中状态
    const checked = page.locator("button[aria-label*='compare.remove']");
    await expect(checked).toBeVisible();
  });

  test("mobile: 选中后 CompareBar 出现", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 选一个模型
    const addBtn = page.locator("button[aria-label*='compare.addToCompare']").first();
    await addBtn.click();
    await page.waitForTimeout(300);

    // CompareBar 出现
    const bar = page.locator("div.fixed.bottom-0");
    await expect(bar).toBeVisible();
  });
});
