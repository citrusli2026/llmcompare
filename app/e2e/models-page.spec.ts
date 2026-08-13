import { test, expect } from "@playwright/test";

const isMobile = (projectName: string) => projectName === "Mobile Chrome";

test.describe("Models Page — 筛选与搜索功能", () => {
  test("desktop: 首页 4 个场景标签全部可见且可切换", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/");

    // 首页场景卡：热度 / 智能 / 编程 / Agent
    const zhLabels = ["热度", "智能", "编程", "Agent"];
    const enLabels = ["Hotness", "Intelligence", "Coding", "Agent"];

    for (let i = 0; i < 4; i++) {
      const btn = page.locator("button").filter({ hasText: new RegExp(`${zhLabels[i]}|${enLabels[i]}`) }).first();
      await expect(btn).toBeVisible();
      await btn.click();
      await page.waitForTimeout(300);
      // 切换后展开区应有模型推荐链接
      await expect(page.locator(".animate-in a[href^='/models/']").first()).toBeVisible();
      // 切换后页面应仍正常
      await expect(page.locator("body")).not.toHaveText(/Error/);
    }
  });

  test("desktop: 搜索框输入 → 表格行数收窄，清空后恢复", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");

    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    const total = await rows.count();
    expect(total).toBeGreaterThan(1);

    // 用第一行模型的完整 id 作搜索词：必命中自身（id 参与匹配），且不可能匹配全部
    const firstId = await rows.first().getAttribute("data-model-id");
    expect(firstId).toBeTruthy();

    const search = page.getByLabel(/搜索模型|Search models/);
    await expect(search).toBeVisible();
    await search.fill(firstId!);

    // URL 同步 ?q=
    await expect(page).toHaveURL(/[?&]q=/);
    // 行数收窄但不为 0
    await expect.poll(async () => rows.count()).toBeLessThan(total);
    expect(await rows.count()).toBeGreaterThan(0);
    // 剩余行包含命中行自身
    await expect(page.locator(`tbody tr[data-model-id="${firstId}"]`)).toBeVisible();

    // 清空搜索 → 恢复全量
    await search.fill("");
    await expect.poll(async () => rows.count()).toBe(total);
  });

  test("desktop: 公司下拉选择 → 表格行均为该公司", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");

    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();

    // 取第一行所属公司（当前类型筛选下必有结果），保证选择后非空
    const firstCompany = (await rows.first().locator("td").nth(2).textContent())?.trim();
    expect(firstCompany).toBeTruthy();

    const companySelect = page.getByLabel(/按公司筛选|Filter by company/);
    await expect(companySelect).toBeVisible();
    await companySelect.selectOption(firstCompany!);

    // URL 同步 ?company=
    await expect(page).toHaveURL(/[?&]company=/);

    // 行数 > 0 且每一行公司列都是所选公司
    await expect.poll(async () => rows.count()).toBeGreaterThan(0);
    const companyCells = page.locator("tbody tr td:nth-child(3)");
    const texts = (await companyCells.allTextContents()).map((t) => t.trim());
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text).toBe(firstCompany);
    }
  });

  test("desktop: 搜索无结果 → 显示空状态", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");

    const search = page.getByLabel(/搜索模型|Search models/);
    await search.fill("no-such-model-exists-zzz");

    // 表格消失，空状态文案出现
    await expect(page.locator("tbody tr")).toHaveCount(0);
    await expect(page.getByText(/未找到匹配的模型|No matching models found/)).toBeVisible();
  });

  test("desktop: 切换筛选恢复模型列表", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");

    // 先筛选：选"开源"
    const openFilter = page.locator("button").filter({ hasText: /^开源$|^Open$/ }).first();
    await openFilter.click();
    await page.waitForTimeout(300);

    // 切换到"闭源"
    const closedFilter = page.locator("button").filter({ hasText: /^闭源$|^Closed$/ }).first();
    await closedFilter.click();
    await page.waitForTimeout(300);

    // 验证有结果
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("desktop: URL 参数与筛选同步", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");

    // 点"闭源" filter，URL 应同步 filter 参数
    const closedFilter = page.locator("button").filter({ hasText: /^闭源$|^Closed Source$/ }).first();
    await expect(closedFilter).toBeVisible();
    await closedFilter.click();
    await expect(page).toHaveURL(/filter=/);
  });

  test("desktop: 排序切换 — 同列点两次改变方向", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");

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

    // 移动端显示卡片结构
    const mobileCard = page.locator("[data-testid='mobile-model-card']").first();
    await expect(mobileCard).toBeVisible();
    // 卡片内有模型名称文字
    await expect(mobileCard.locator("a, span, div").filter({ hasText: /^(?!$)/ }).first()).toBeAttached();
  });

  test("mobile: /models 页面语言切换", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/models");

    // 切换语言（EN/中 文本按钮，取移动端可见的那个）
    const langBtn = page.getByRole("button", { name: /^EN$|^中$/ }).locator("visible=true");
    await expect(langBtn).toBeVisible();
    await langBtn.click();

    // 切换后：localStorage 记住 en，导航栏品牌变为英文
    await expect.poll(() => page.evaluate(() => localStorage.getItem("llmcompare-locale"))).toBe("en");
    await expect(page.locator("header")).toContainText("LLMCompare");
  });
});
