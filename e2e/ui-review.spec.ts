import { test, expect } from "@playwright/test";

const SCREENSHOTS = "e2e/screenshots";
const isMobile = (projectName: string) => projectName === "Mobile Chrome";

// ─── Stats Strip ───────────────────────────────────────────────────
test.describe("StatsStrip — 首页数据概览卡片", () => {
  test("desktop: 4 卡片全部渲染且有有效数据", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // StatsStrip 区域可见
    const strip = page.locator("section.px-4.pt-2");
    await expect(strip).toBeVisible();

    // 4 卡片结构
    const cards = strip.locator("> div > div.grid > div.rounded-xl");
    await expect(cards).toHaveCount(4);

    // 卡片1: 收录模型数，数值 > 0
    const card0 = cards.nth(0);
    await expect(card0.locator("svg")).toBeVisible(); // Bot icon
    const val0 = card0.locator("p.text-2xl");
    await expect(val0).toBeVisible();
    const num0 = parseInt(await val0.textContent() || "0");
    expect(num0).toBeGreaterThan(0);

    // 卡片2: 最高智能分
    const val1 = cards.nth(1).locator("p.text-2xl");
    await expect(val1).toBeVisible();

    // 卡片3: 本月新增
    const val2 = cards.nth(2).locator("p.text-2xl");
    await expect(val2).toBeVisible();

    // 卡片4: 更新日期
    const card3 = cards.nth(3);
    await expect(card3.locator("svg")).toBeVisible(); // Calendar icon
    const val3 = card3.locator("p.text-2xl");
    await expect(val3).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOTS}/ui-statsstrip-desktop.png`, fullPage: true });
  });

  test("mobile: StatsStrip 变为 2 列布局", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const strip = page.locator("section.px-4.pt-2");
    await expect(strip).toBeVisible();

    // 移动端 grid-cols-2
    const grid = strip.locator("> div > div.grid");
    await expect(grid).toHaveClass(/grid-cols-2/);

    // 4 卡片都存在
    const cards = strip.locator("> div > div.grid > div.rounded-xl");
    await expect(cards).toHaveCount(4);

    await page.screenshot({ path: `${SCREENSHOTS}/ui-statsstrip-mobile.png`, fullPage: true });
  });
});

// ─── ScoreBar — 分数进度条 ─────────────────────────────────────────
test.describe("ScoreBar — 表格分数可视化", () => {
  test("desktop: 智能列显示进度条替代纯文本分数", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    // 首页已改为场景卡片，ScoreBar 在 /models 页面
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 智能列头点击排序
    const intelHeader = page.locator("th").filter({ hasText: /智能|Intelligence/ });
    await intelHeader.click();
    await page.waitForTimeout(500);

    // 检查第一个数据行的进度条
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();

    // ScoreBar: 分数数字 + 进度条
    // td(0)=checkbox td(1)=name td(2)=company td(3)=date td(4)=intelligence
    const scoreCell = firstRow.locator("td").nth(4);
    // 分数文本有 tabular-nums class
    const scoreSpan = scoreCell.locator("span.tabular-nums");
    await expect(scoreSpan.first()).toBeVisible();

    // 进度条背景轨
    const bar = scoreCell.locator("div.rounded-full.bg-surface-border");
    await expect(bar.first()).toBeVisible();

    // 进度条填充 (violet/cyan/amber/muted 任一)
    const fill = scoreCell.locator("[class*='bg-accent-lime'], [class*='bg-accent-violet'], [class*='bg-accent-coral'], [class*='bg-text-muted']");
    await expect(fill.first()).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOTS}/ui-scorebar-desktop.png`, fullPage: true });
  });

  test("desktop: 无分数模型显示 —", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    // /models 页展示全部 46 个模型，GPT-5.5 Pro 等无 intelligence 数据
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 找所有行，至少有一行在智能列显示 —
    // td(0)=checkbox td(1)=name td(2)=company td(3)=date
    // td(4)=intel td(5)=coding td(6)=agentic td(7)=cost td(8)=tokens
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    let foundDash = false;
    for (let i = 0; i < count; i++) {
      const cell = rows.nth(i).locator("td").nth(4);
      const text = await cell.textContent();
      if (text?.includes("—")) {
        foundDash = true;
        break;
      }
    }
    expect(foundDash).toBe(true);
  });
});

// ─── 完整页面截图审查 ───────────────────────────────────────────
test.describe("Full-Page Visual Review", () => {
  test("desktop: 首页全页截图 (含 StatsStrip + ScoreBar)", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${SCREENSHOTS}/full-home-desktop.png`, fullPage: true });
  });

  test("mobile: 首页全页截图", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${SCREENSHOTS}/full-home-mobile.png`, fullPage: true });
  });

  test("desktop: 模型详情页截图", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/deepseek-v3");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: `${SCREENSHOTS}/full-detail-desktop.png`, fullPage: true });
  });

  test("desktop: /models 页面截图", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: `${SCREENSHOTS}/full-models-desktop.png`, fullPage: true });
  });
});

// ─── 响应式与交互 ───────────────────────────────────────────────
test.describe("Interaction & Responsiveness", () => {
  test("desktop: 排序后 ScoreBar 保持渲染", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    // 首页已改为场景卡片，表格排序在 /models 页面
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 依次点击各个可排序列头
    const sortableHeaders = ["智能", "编程", "Agent", "Arena"];
    for (const label of sortableHeaders) {
      const header = page.locator("th").filter({ hasText: new RegExp(label) });
      if (await header.isVisible().catch(() => false)) {
        await header.click();
        await page.waitForTimeout(300);
      }
    }

    // 最终回到智能列
    const intelHeader = page.locator("th").filter({ hasText: /智能|Intelligence/ });
    await intelHeader.click();
    await page.waitForTimeout(500);

    const bars = page.locator("tbody tr").first().locator("div.rounded-full.bg-surface-border");
    await expect(bars.first()).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOTS}/ui-sort-scorebar.png`, fullPage: true });
  });

  test("mobile: 场景排序后卡片重新渲染", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    // 首页已改为场景卡片，表格在 /models 页面
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // /models 使用场景排序按钮而非下拉 select
    const sortButtons = page.locator("button").filter({ hasText: /智能|编程|Agent|Intelligence|Coding/ });
    await expect(sortButtons.first()).toBeVisible();

    // 点击排序按钮触发重新排序
    await sortButtons.first().click();
    await page.waitForTimeout(500);

    // 移动端卡片显示
    const cards = page.locator("[class*='rounded']");
    await expect(cards.first()).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOTS}/ui-mobile-sorted.png`, fullPage: true });
  });

  test("desktop: 语言切换后 StatsStrip 翻译生效", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 当前是中文，验证中文文案 (i18n: "收录模型" / "最高智能分")
    await expect(page.locator("body")).toContainText("收录模型");
    await expect(page.locator("body")).toContainText("最高智能分");

    // 切换英文
    const langBtn = page.locator("button[aria-label='切换语言'], button[aria-label='Switch language']");
    if (await langBtn.isVisible().catch(() => false)) {
      await langBtn.click();
      await page.waitForTimeout(500);

      // 验证英文 StatsStrip (i18n: "Models" / "Top Score")
      await expect(page.locator("body")).toContainText("Top Score");
    }

    await page.screenshot({ path: `${SCREENSHOTS}/ui-lang-en.png`, fullPage: true });
  });
});

// ─── 无障碍与性能 ───────────────────────────────────────────────
test.describe("Accessibility & Performance", () => {
  test("desktop: 无控制台错误", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await page.goto("/models");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await page.goto("/about");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
  });

  test("desktop: StatsStrip 卡片颜色遵循设计系统", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 图标容器应有 bg-accent-violet/15 背景
    const iconBoxes = page.locator("[class*='bg-accent-violet/15']");
    await expect(iconBoxes.first()).toBeVisible();

    // 每张卡片应有 border-surface-border 边框（Tailwind v4 设计 Token）
    const cardBorder = page.locator("[class*='border-surface-border']");
    await expect(cardBorder.first()).toBeVisible();

    // 卡片标题应为 text-xs text-text-muted
    const cardLabels = page.locator("p.uppercase.tracking-wider");
    await expect(cardLabels.first()).toBeVisible();

    // 数值应为 text-2xl font-bold
    const cardValues = page.locator("p.text-2xl.font-bold");
    await expect(cardValues.first()).toBeVisible();
  });
});
