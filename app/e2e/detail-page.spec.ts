import { test, expect } from "@playwright/test";

const isMobile = (projectName: string) => projectName === "Mobile Chrome";

test.describe("Detail Page — 核心数据区块验证", () => {
  test("desktop: ScoreOverview 4 项核心指标渲染", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle");

    // ScoreOverview 标题 + 四项指标标签
    await expect(page.getByRole("heading", { name: /分数概览|Score Overview/ })).toBeVisible();
    for (const label of [/综合智能|Intelligence/, /编程|Coding/, /Agent能力|Agent/, /速度 \(TPS\)|Speed \(TPS\)/]) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible();
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

    // 价格区块标题 + AA 美元定价（gpt-5-5 无国内官价，必有 AA $ 价）
    await expect(page.getByRole("heading", { name: /价格|Pricing/ })).toBeVisible();
    await expect(page.locator("text=/\\$5/").first()).toBeVisible();
  });

  test("desktop: Speed TPS 数据显示", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle");

    // 速度区块标题 + 中位 TPS / TTFT 标签
    await expect(page.getByRole("heading", { name: /速度性能|Speed Performance/ })).toBeVisible();
    await expect(page.locator("text=/中位 TPS|Median TPS/").first()).toBeVisible();
    await expect(page.locator("text=/首 Token 延迟|Time to First Token/").first()).toBeVisible();
  });

  test("desktop: Context Window 上下文长度显示", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle");

    // QuickFacts 中的上下文窗口标签 + 数值（gpt-5-5 为 922K）
    await expect(page.locator("text=/上下文窗口|Context Window/").first()).toBeVisible();
    await expect(page.locator("text=/922K|922,000/").first()).toBeVisible();
  });

  test("desktop: Benchmark 表格（GPQA 等单项基准）", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle");

    // Benchmark 区块标题 + 单项基准名称（gpt-5-5 有 GPQA 分数）
    await expect(page.getByRole("heading", { name: /基准测试|Benchmarks/ })).toBeVisible();
    await expect(page.locator("text=GPQA").first()).toBeVisible();
  });

  test("desktop: Vendor Links（官网/控制台外链）", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle");

    // CTA 组：gpt-5-5 有官网 + 控制台外链
    const externalLinks = page.locator("main a[target='_blank'], div.mx-auto a[target='_blank']");
    await expect(externalLinks.first()).toBeVisible();
    await expect(page.locator("a[href='https://openai.com']")).toBeVisible();
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
