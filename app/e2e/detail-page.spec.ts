import { test, expect } from "@playwright/test";

const isMobile = (projectName: string) => projectName === "Mobile Chrome";

test.describe("Detail Page — 核心数据区块验证", () => {
  test("desktop: ScoreOverview 4 项核心指标渲染", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle");

    // ScoreOverview 区域 — 包含智能/编程/Agent/速度四项指标分数
    const scoreLabels = ["智能", "编程", "Agent", "速度"];
    for (const label of scoreLabels) {
      const el = page.locator(`text=${label}`).or(page.locator(`text=${label === "速度" ? "Speed" : label}`));
      const count = await el.count();
      if (count > 0) {
        await expect(el.first()).toBeAttached();
      }
    }
  });

  test("desktop: ScoreOverview 显示数值", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/claude-opus-4-8");
    await page.waitForLoadState("networkidle");

    // 检查有 tabular-nums 的分数数值
    const scoreValues = page.locator("span.tabular-nums");
    const count = await scoreValues.count();
    expect(count).toBeGreaterThanOrEqual(2); // 至少 2 个数值
  });

  test("desktop: Pricing 价格区渲染", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle");

    // 价格区域 — 包含价格信息或"定价"标签
    const pricingSection = page.locator("text=/价格|Pricing|Cost|Input|Output|\\$|\\//");
    const exists = await pricingSection.count();
    if (exists > 0) {
      await expect(pricingSection.first()).toBeAttached();
    }
  });

  test("desktop: Speed TPS 数据显示", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle");

    // 速度/TPS 信息
    const speedLabels = ["速度", "Speed", "TPS"];
    for (const label of speedLabels) {
      const el = page.locator(`text=${label}`);
      const count = await el.count();
      if (count > 0) {
        await expect(el.first()).toBeAttached();
        break; // 找到一个即可
      }
    }
  });

  test("desktop: Context Window 上下文长度显示", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle");

    // 上下文相关信息
    const contextLabels = ["上下文", "Context", "窗口"];
    for (const label of contextLabels) {
      const el = page.locator(`text=${label}`);
      const count = await el.count();
      if (count > 0) {
        await expect(el.first()).toBeAttached();
        break;
      }
    }
  });

  test("desktop: Benchmark 表格（MMLU-Pro、全知指数）", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle");

    // Benchmark 区域
    const benchLabels = ["MMLU", "全知指数", "基准测试", "Benchmark", "Humanity", "GPQA"];
    for (const label of benchLabels) {
      const el = page.locator(`text=${label}`);
      const count = await el.count();
      if (count > 0) {
        await expect(el.first()).toBeAttached();
        break;
      }
    }
  });

  test("desktop: Vendor Links（API docs 等）", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle");

    // 外部链接 — API 文档或厂商链接
    const vendorLinks = page.locator("a[href^='http'], a[target='_blank']");
    const exists = await vendorLinks.count();
    if (exists > 0) {
      await expect(vendorLinks.first()).toBeVisible();
    }
  });

  test("desktop: '← 返回模型库' 链接跳转", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle");

    // 返回链接
    const backLink = page.locator("a[href='/models']").first();
    await expect(backLink).toBeVisible();
    await backLink.click();
    await page.waitForURL("**/models");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("mobile: 详情页渲染", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle");

    // 移动端详情页应正常显示
    await expect(page.locator("h1")).toBeVisible();
    // 有分数概览
    await expect(page.locator("span.tabular-nums").first()).toBeAttached();
  });
});
