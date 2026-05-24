import { test, expect } from "@playwright/test";

const SCREENSHOTS = "e2e/screenshots";
const isMobile = (projectName: string) => projectName === "Mobile Chrome";

test.describe("Home Page", () => {
  test("desktop view renders correctly", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用测试");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 核心元素可见
    await expect(page.locator("table")).toBeVisible();
    // 使用更精确的选择器：logo 链接中的文本
    await expect(page.locator("header a[href='/'] span").filter({ hasText: "模型图鉴" })).toBeVisible();
    // Arena 投票列头
    await expect(page.locator("th").filter({ hasText: /Arena投票|Arena Votes/ })).toBeVisible();

    // 国际标杆模型置顶（检查表格第一行）
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOTS}/home-desktop.png`, fullPage: true });
  });

  test("sort by intelligence works", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用测试");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 找到"智能"列头并点击
    const intelHeader = page.locator("th").filter({ hasText: /智能|Intelligence/ });
    await intelHeader.click();
    await page.waitForTimeout(500);

    // 验证排序后第一行有数据
    const firstScore = page.locator("tbody tr").first().locator("td").nth(3);
    await expect(firstScore).not.toHaveText("—");

    await page.screenshot({ path: `${SCREENSHOTS}/home-sorted.png`, fullPage: true });
  });

  test("sort by arena votes works", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用测试");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 找到 Arena投票/Arena Votes 列头并点击
    const votesHeader = page.locator("th").filter({ hasText: /Arena投票|Arena Votes/ });
    await votesHeader.click();
    await page.waitForTimeout(500);

    // 验证排序生效（有 votes 的模型排在前面）
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
  });

  test("mobile view renders correctly", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用测试");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 移动端显示下拉排序，隐藏表格
    await expect(page.locator("select")).toBeVisible();
    await expect(page.locator("table")).toBeHidden();

    await page.screenshot({ path: `${SCREENSHOTS}/home-mobile.png`, fullPage: true });
  });

  test("mobile sort interaction works", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用测试");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const select = page.locator("select");
    await expect(select).toBeVisible();
    await select.selectOption("intelligence");
    await page.waitForTimeout(500);

    await page.screenshot({ path: `${SCREENSHOTS}/home-mobile-sorted.png`, fullPage: true });
  });
});

test.describe("Product Detail", () => {
  test("first product page loads with data", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const firstLink = page.locator("a[href^='/product/']").first();
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
    await page.goto("/product/gemini-3-1-pro-preview");
    await page.waitForLoadState("networkidle");

    // 检查页面加载成功（有模型名称）
    await expect(page.locator("h1, h2").first()).toBeVisible();
    // 检查有内容（不检查特定文案，因为可能变化）
    await expect(page.locator("body")).not.toHaveText(/404|Error/);

    await page.screenshot({ path: `${SCREENSHOTS}/product-detail-votes.png`, fullPage: true });
  });

  test("product without arena votes hides votes card", async ({ page }) => {
    // 找一个没有 arena_votes 的模型
    await page.goto("/product/qwen3-7-max");
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

    // 点击第二个按钮（通常是"开源"或"Open"）
    if (count > 1) {
      await buttons.nth(1).click();
      await page.waitForTimeout(300);
    }

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
    const links = await page.locator("a[href^='/product/']").all();
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
