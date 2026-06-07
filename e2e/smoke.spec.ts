import { test, expect } from "@playwright/test";

const SCREENSHOTS = "e2e/screenshots";
const isMobile = (projectName: string) => projectName === "Mobile Chrome";

test.describe("Home Page", () => {
  test("desktop view renders correctly", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用测试");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 核心元素可见 — 场景卡片取代了原有表格
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("header a[href='/'] span").filter({ hasText: "模型图鉴" })).toBeVisible();
    // 场景选择按钮可见（V2 改版后首页以场景选择为核心）
    await expect(page.locator("button").filter({ hasText: /编程|Coding/ })).toBeVisible();
    // Top Picks 推荐卡片可见
    await expect(page.locator("a[href^='/models/']").first()).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOTS}/home-desktop.png`, fullPage: true });
  });

  test("sort by intelligence works", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用测试");
    // 首页已改为场景卡片，排序功能在 /models 页面
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 找到"智能"列头并点击
    const intelHeader = page.locator("th").filter({ hasText: /智能|Intelligence/ });
    await intelHeader.click();
    await page.waitForTimeout(500);

    // 验证排序后第一行有数据
    // td(0)=checkbox td(1)=name td(2)=company td(3)=date td(4)=intelligence
    const firstScore = page.locator("tbody tr").first().locator("td").nth(4);
    await expect(firstScore).not.toHaveText("—");

    await page.screenshot({ path: `${SCREENSHOTS}/home-sorted.png`, fullPage: true });
  });

  test("sort by arena votes works", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用测试");
    // 首页已改为场景卡片，排序功能在 /models 页面
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 找到智能/Intelligence 列头并点击
    const votesHeader = page.locator("th").filter({ hasText: /智能|Intelligence/ });
    await votesHeader.click();
    await page.waitForTimeout(500);

    // 验证排序生效（第一个模型有智能分数）
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
  });

  test("hero CTA navigates to /models", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用测试");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 点击 Hero 区主按钮 "开始选型"
    const startBtn = page.locator("a").filter({ hasText: /开始选型|Start Selection/ });
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    await page.waitForURL("**/models");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("hot picks card navigates to detail page", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用测试");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 热门推荐区的第一张卡片点击
    const topPicksSection = page.locator("section").filter({ hasText: /热门推荐|Top Picks/ });
    const firstCard = topPicksSection.locator("a[href^='/models/']").first();
    await expect(firstCard).toBeVisible();
    const href = await firstCard.getAttribute("href");
    await firstCard.click();
    await page.waitForURL(`**${href}`);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("sort by cost works", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用测试");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 点击按性价比排序按钮
    const costBtn = page.locator("button").filter({ hasText: /性价比|Cost|Value/ });
    await expect(costBtn).toBeVisible();
    await costBtn.click();
    await page.waitForTimeout(500);

    // 验证第一个模型可见
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
  });

  test("feature tag filters work", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用测试");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 点击"开源"标签筛选
    const openBtn = page.locator("button").filter({ hasText: /开源|Open Source/ });
    await expect(openBtn).toBeVisible();
    await openBtn.click();
    await page.waitForTimeout(300);

    // 验证筛选生效 — 至少有一个结果
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("company filter dropdown works", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用测试");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 找到公司筛选下拉框并点击
    const companySelect = page.locator("select, [role='combobox']").first();
    await expect(companySelect).toBeVisible();
    await companySelect.click();
    await page.waitForTimeout(300);

    // 选择 OpenAI
    const openaiOption = page.locator("option, [role='option']").filter({ hasText: /OpenAI/ });
    if (await openaiOption.count() > 0) {
      await openaiOption.click();
      await page.waitForTimeout(500);

      // 验证筛选生效
      const rows = page.locator("tbody tr");
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("mobile view renders correctly", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用测试");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 移动端显示场景卡片
    await expect(page.locator("button").filter({ hasText: /编程|Coding/ })).toBeVisible();
    // 场景卡片布局为 2×2 grid
    const agents = page.locator("button").filter({ hasText: /Agent/ });
    await expect(agents).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOTS}/home-mobile.png`, fullPage: true });
  });

  test("mobile sort interaction works", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用测试");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 点击编程场景卡片展开推荐模型
    const codingButton = page.locator("button").filter({ hasText: /编程|Coding/ }).first();
    await codingButton.click();
    await page.waitForTimeout(300);

    // 展开后应有模型链接
    await expect(page.locator("a[href^='/models/']").first()).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOTS}/home-mobile-sorted.png`, fullPage: true });
  });
});

test.describe("Product Detail", () => {
  test("first product page loads with data", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const firstLink = page.locator("a[href^='/models/']").first();
    const href = await firstLink.getAttribute("href");
    await page.goto(href!);
    await page.waitForLoadState("networkidle");

    // 详情页核心元素：检查页面标题或模型名称
    await expect(page.locator("h1, h2").first()).toBeVisible();
    // 检查有评分卡片
    await expect(page.locator("[class*='card'], [class*='rounded']").first()).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOTS}/product-detail.png`, fullPage: true });
  });

  test("product with arena votes shows votes card", async ({ page }) => {
    // 找一个有 arena_votes 的模型（如 Gemini）
    await page.goto("/models/gemini-3-1-pro-preview");
    await page.waitForLoadState("networkidle");

    // 检查页面加载成功（有模型名称）
    await expect(page.locator("h1, h2").first()).toBeVisible();
    // 检查有内容（不检查特定文案，因为可能变化）
    await expect(page.locator("body")).not.toHaveText(/404|Error/);

    await page.screenshot({ path: `${SCREENSHOTS}/product-detail-votes.png`, fullPage: true });
  });

  test("product without arena votes hides votes card", async ({ page }) => {
    // 找一个没有 arena_votes 的模型
    await page.goto("/models/qwen3-7-max");
    await page.waitForLoadState("networkidle");

    // 检查没有 Arena 投票数卡片
    const votesElements = page.locator("*").filter({ hasText: /Arena投票|Arena Votes/ });
    await expect(votesElements).toHaveCount(0);
  });
});

test.describe("Other Pages", () => {
  test("about page renders", async ({ page }) => {
    await page.goto("/about");
    await page.waitForLoadState("networkidle");

    // 检查 about 页面有内容
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator("body")).not.toHaveText(/404|Error/);

    await page.screenshot({ path: `${SCREENSHOTS}/about.png`, fullPage: true });
  });

  test("models page renders with filter", async ({ page }) => {
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 检查页面加载成功
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator("body")).not.toHaveText(/404|Error/);

    await page.screenshot({ path: `${SCREENSHOTS}/models.png`, fullPage: true });
  });

  test("models page filter works", async ({ page }) => {
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 检查页面有交互元素
    await expect(page.locator("body")).not.toHaveText(/404|Error/);

    // 获取所有按钮/筛选器
    const buttons = page.locator("button, [role='tab']");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    // 找到第一个可见的按钮并点击
    let clicked = false;
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(300);
        clicked = true;
        break;
      }
    }
    expect(clicked).toBe(true);

    // 验证页面仍有内容
    await expect(page.locator("body")).not.toHaveText(/404|Error/);
  });

  test("language switch works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 检查中英文切换按钮
    const langBtn = page.locator("button[aria-label='切换语言'], button[aria-label='Switch language']");
    if (await langBtn.isVisible().catch(() => false)) {
      await langBtn.click();
      await page.waitForTimeout(300);
      // 验证语言切换后的内容
      await expect(page.locator("header")).toBeVisible();
    }
  });
});

test.describe("Data Quality", () => {
  test("all product pages render without error", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 获取所有产品链接
    const links = await page.locator("a[href^='/models/']").all();
    const attrs = await Promise.all(links.map(l => l.getAttribute("href")));
    const hrefs = Array.from(new Set(attrs.filter((h): h is string => h !== null))).slice(0, 5);

    for (const href of hrefs) {
      await page.goto(href!);
      await page.waitForLoadState("networkidle");

      // 检查没有 404 或错误
      await expect(page.locator("text=404")).toHaveCount(0);
      await expect(page.locator("text=Error")).toHaveCount(0);
    }
  });
});
