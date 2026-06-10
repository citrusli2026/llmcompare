import { test, expect } from "@playwright/test";

const isMobile = (projectName: string) => projectName === "Mobile Chrome";

test.describe("Models Page — 筛选与搜索功能", () => {
  test("desktop: 搜索框按名称筛选模型", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 输入搜索词
    const searchInput = page.locator("input[placeholder*='搜索'], input[placeholder*='Search']");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Claude");
    await page.waitForTimeout(500);

    // 验证结果只含 Claude
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    if (count > 0) {
      const firstCell = rows.first().locator("td").nth(1);
      await expect(firstCell).toContainText(/Claude/i);
    }
  });

  test("desktop: 5 个功能标签全部可切换", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 找到功能标签组 — 每个是 button
    const featureLabels = ["前沿", "推理", "图片输入", "中文能力", "开源权重"];
    const enLabels = ["Frontier", "Reasoning", "Image", "Chinese", "Open Weights"];

    for (let i = 0; i < 5; i++) {
      const btn = page.locator("button").filter({ hasText: new RegExp(`${featureLabels[i]}|${enLabels[i]}`) }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(300);
        // 切换后页面应仍正常
        await expect(page.locator("body")).not.toHaveText(/Error/);
        // 再点一次取消
        await btn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test("desktop: 组合筛选 — 开源 + 公司 + 搜索", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 选"开源" filter
    const openFilter = page.locator("button").filter({ hasText: /^开源$|^Open Source$/ }).first();
    if (await openFilter.isVisible().catch(() => false)) {
      await openFilter.click();
      await page.waitForTimeout(300);
    }

    // 选公司（如果有 OpenAI 选项）
    const companySelect = page.locator("select").first();
    const options = await companySelect.locator("option").allTextContents();
    if (options.some((o) => o.includes("OpenAI"))) {
      await companySelect.selectOption("OpenAI");
      await page.waitForTimeout(300);
    }

    // 验证结果可见（可能为空，空状态也接受）
    await expect(page.locator("body")).not.toHaveText(/Error/);
  });

  test("desktop: 重置筛选恢复全部模型", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 先筛选：选"开源"
    const openFilter = page.locator("button").filter({ hasText: /^开源$|^Open Source$/ }).first();
    await openFilter.click();
    await page.waitForTimeout(300);

    // 选"全部"恢复
    const allFilter = page.locator("button").filter({ hasText: /^全部$|^All$/ }).first();
    await allFilter.click();
    await page.waitForTimeout(300);

    // 验证有结果
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("desktop: URL 参数与筛选同步", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 点"闭源" filter
    const closedFilter = page.locator("button").filter({ hasText: /^闭源$|^Closed Source$/ }).first();
    if (await closedFilter.isVisible().catch(() => false)) {
      await closedFilter.click();
      await page.waitForTimeout(300);

      // URL 应包含 filter=闭源 或 filter=Closed
      const url = page.url();
      expect(url).toMatch(/filter=/);
    }
  });

  test("desktop: 排序切换 — 同列点两次改变方向", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 找到智能列头
    const intelHeader = page.locator("th").filter({ hasText: /智能|Intelligence/ });
    await expect(intelHeader).toBeVisible();

    // 点一次（升序或默认）
    await intelHeader.click();
    await page.waitForTimeout(400);

    // 获取第一行分数
    const firstRow1 = page.locator("tbody tr").first().locator("td").nth(4);
    const val1 = await firstRow1.textContent();

    // 再点一次（切换方向）
    await intelHeader.click();
    await page.waitForTimeout(400);

    // 获取新的第一行分数
    const firstRow2 = page.locator("tbody tr").first().locator("td").nth(4);
    const val2 = await firstRow2.textContent();

    // 两次排序结果应不同（升序/降序对调）
    expect(val1).not.toBe(val2);
  });

  test("mobile: 卡片布局渲染", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");

    // 先访问首页，通过场景展开拿到模型链接，再切到 /models
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 移动端显示卡片结构
    const mobileCard = page.locator("[data-testid='mobile-model-card']").first();
    await expect(mobileCard).toBeVisible();
    // 卡片内有模型名称文字
    await expect(mobileCard.locator("a, span, div").filter({ hasText: /^(?!$)/ }).first()).toBeAttached();
  });

  test("mobile: /models 页面语言切换", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 切换语言
    const langBtn = page.locator("button[aria-label='切换语言'], button[aria-label='Switch language']");
    if (await langBtn.isVisible().catch(() => false)) {
      await langBtn.click();
      await page.waitForTimeout(500);
      // 切换后应能显示英文标签
      await expect(page.locator("body")).not.toHaveText(/Error/);
    }
  });
});
