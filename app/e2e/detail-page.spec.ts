import { test, expect } from "@playwright/test";
import { modelWithFullDetail, contextWindowText } from "./test-data";

const isMobile = (projectName: string) => projectName === "Mobile Chrome";

test.describe("Detail Page — 核心数据区块验证", () => {
  // 详情页数据齐全的模型：评分/价格/速度/上下文/基准/官网外链都有。
  // 从榜单数据动态选取，避免硬编码 id 在数据刷新后 404（详见 e2e/test-data.ts）。
  const detail = modelWithFullDetail();
  const detailUrl = `/models/${detail.id}`;
  const homepageHost = new URL(detail.vendor_links!.homepage!).host;
  const ctxText = contextWindowText(detail.meta!.context_window);

  test("desktop: ScoreOverview 4 项核心指标渲染", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto(detailUrl);

    // ScoreOverview 标题 + 四项指标标签
    await expect(page.getByRole("heading", { name: /分数概览|Score Overview/ })).toBeVisible();
    for (const label of [/综合智能|Intelligence/, /编程|Coding/, /Agent能力|Agent/, /速度 \(TPS\)|Speed \(TPS\)/]) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible();
    }
  });

  test("desktop: ScoreOverview 显示数值", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto(detailUrl);

    // 检查有 tabular-nums 的分数数值
    const scoreValues = page.locator("span.tabular-nums");
    const count = await scoreValues.count();
    expect(count).toBeGreaterThanOrEqual(2); // 至少 2 个数值
  });

  test("desktop: Pricing 价格区渲染", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto(detailUrl);

    // 价格区块标题 + 该模型的 AA 美元定价（选取条件保证无国内官价，必有 $ 价）
    await expect(page.getByRole("heading", { name: /价格|Pricing/ })).toBeVisible();
    await expect(page.locator("body")).toContainText(`$${detail.pricing!.input}`);
  });

  test("desktop: Speed TPS 数据显示", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto(detailUrl);

    // 速度区块标题 + 中位 TPS / TTFT 标签
    await expect(page.getByRole("heading", { name: /速度性能|Speed Performance/ })).toBeVisible();
    await expect(page.locator("text=/中位 TPS|Median TPS/").first()).toBeVisible();
    await expect(page.locator("text=/首 Token 延迟|Time to First Token/").first()).toBeVisible();
  });

  test("desktop: Context Window 上下文长度显示", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto(detailUrl);

    // QuickFacts 中的上下文窗口标签 + 按榜单数据格式化出的数值
    await expect(page.locator("text=/上下文窗口|Context Window/").first()).toBeVisible();
    await expect(page.getByText(ctxText, { exact: true }).first()).toBeVisible();
  });

  test("desktop: Benchmark 表格（GPQA 等单项基准）", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto(detailUrl);

    // Benchmark 区块标题 + 单项基准名称（选取条件保证该模型有 GPQA 分数）
    await expect(page.getByRole("heading", { name: /基准测试|Benchmarks/ })).toBeVisible();
    await expect(page.locator("text=GPQA").first()).toBeVisible();
  });

  test("desktop: Vendor Links（官网/控制台外链）", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto(detailUrl);

    // CTA 组：该模型配置了官网外链
    const externalLinks = page.locator("main a[target='_blank'], div.mx-auto a[target='_blank']");
    await expect(externalLinks.first()).toBeVisible();
    await expect(page.locator(`a[href*='${homepageHost}']`).first()).toBeVisible();
  });

  test("desktop: '← 返回模型库' 链接跳转", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto(detailUrl);

    // 返回链接
    const backLink = page.locator("a[href='/models']").first();
    await expect(backLink).toBeVisible();
    await backLink.click();
    await page.waitForURL("**/models");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("mobile: 详情页渲染", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto(detailUrl);

    // 移动端详情页应正常显示
    await expect(page.locator("h1")).toBeVisible();
    // 有分数概览
    await expect(page.locator("span.tabular-nums").first()).toBeAttached();
  });
});
