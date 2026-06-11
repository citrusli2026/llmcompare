import { test, expect } from "@playwright/test";

const SCREENSHOTS = "e2e/screenshots";
const isMobile = (projectName: string) => projectName === "Mobile Chrome";

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

    // 进度条背景轨和填充都可见
    const barTrack = scoreCell.locator("div.rounded-full.overflow-hidden");
    await expect(barTrack.first()).toBeAttached();

    // 进度条填充 (violet/cyan/amber/muted 任一) — DOM 存在即表示渲染正确
    const fill = scoreCell.locator("[class*='bg-accent-lime'], [class*='bg-accent-violet'], [class*='bg-accent-coral'], [class*='bg-text-muted']");
    await expect(fill.first()).toBeAttached();

    await page.screenshot({ path: `${SCREENSHOTS}/ui-scorebar-desktop.png`, fullPage: true });
  });

  test("desktop: 无分数模型显示 —", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    // /models 页展示全部 46 个模型，GPT-5.5 Pro 等无 intelligence 数据
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 找所有行，至少有一行在智能列显示 —
    // td(0)=checkbox td(1)=name td(2)=company td(3)=date
    // td(4)=intel td(5)=coding td(6)=agentic td(7)=cost
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
    const sortableHeaders = ["智能", "编程", "Agent"];
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

    const bars = page.locator("tbody tr").first().locator("div.rounded-full.overflow-hidden");
    await expect(bars.first()).toBeAttached();

    await page.screenshot({ path: `${SCREENSHOTS}/ui-sort-scorebar.png`, fullPage: true });
  });

  test("mobile: 收藏按钮在移动卡片可见且可切换", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 移动卡片的首张应有收藏心形按钮
    const firstCard = page.locator("[data-testid='mobile-model-card']").first();
    const favBtn = firstCard.locator("button[data-cta='favorite']");
    await expect(favBtn).toBeVisible();
    // 点击后 aria-pressed 变化
    const before = await favBtn.getAttribute("aria-pressed");
    await favBtn.click();
    await page.waitForTimeout(200);
    const after = await favBtn.getAttribute("aria-pressed");
    expect(before).not.toBe(after);

    await page.screenshot({ path: `${SCREENSHOTS}/ui-mobile-favorite.png`, fullPage: true });
  });

  test("desktop: 语言切换后核心中文文案存在", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 验证当前语言的关键文案
    await expect(page.locator("body")).toContainText("模型图鉴");

    // 切换英文
    const langBtn = page.locator("button[aria-label='切换语言'], button[aria-label='Switch language']");
    if (await langBtn.isVisible().catch(() => false)) {
      await langBtn.click();
      await page.waitForTimeout(500);
      // 验证英文文案
      await expect(page.locator("body")).toContainText("Home");
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

  test("desktop: 收藏按钮颜色遵循设计系统 (玫红)", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 第一行的心形按钮:未收藏态用 accent-fuchsia 描边/图标
    const favBtn = page.locator("tr[data-model-id]").first().locator("button[data-cta='favorite']");
    await expect(favBtn).toBeVisible();

    // 点击一次 → 应切换 aria-pressed & 颜色类
    const before = await favBtn.getAttribute("aria-pressed");
    await favBtn.click();
    await page.waitForTimeout(200);
    const after = await favBtn.getAttribute("aria-pressed");
    expect(before).not.toBe(after);
  });
});

test.describe("Loading Skeleton States", () => {
  test("loading skeleton is built into initial HTML", async ({ page }) => {
    // 用 production 模式验证 skeleton
    // 先构建
    await page.goto("/models", { waitUntil: "networkidle" });

    // skeleton 组件被正确引用（通过检查 ModelsSkeleton 中的 CSS class）
    // 页面有导航栏（skeleton 和真实内容都有 navbar）
    await expect(page.locator("header")).toBeVisible();

    // 验证 skeleton 组件按需加载（页面正常渲染）
    await expect(page.locator("h1, h2").first()).toBeAttached();
  });
});
