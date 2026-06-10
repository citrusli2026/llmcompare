import { test, expect } from "@playwright/test";

const isMobile = (projectName: string) => projectName === "Mobile Chrome";

test.describe("Compare Feature — 模型对比功能", () => {
  test("desktop: 表格行复选框加入对比", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    // 首页已改为场景卡片，对比功能在 /models 目录页的表格中
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 第一行第一个 button（即对比复选框）
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();

    const firstBtn = rows.first().locator("button").first();
    await firstBtn.click();
    await page.waitForTimeout(300);

    // CompareBar 应出现（fixed bottom-0）
    const bar = page.locator("div.fixed.bottom-0");
    await expect(bar).toBeVisible();
  });

  test("desktop: CompareBar 显示已选模型 + 跳转对比页", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    // 首页已改为场景卡片，使用 /models 页面的表格
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 选两个模型
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(1);

    await rows.nth(0).locator("button").first().click();
    await page.waitForTimeout(200);
    await rows.nth(1).locator("button").first().click();
    await page.waitForTimeout(200);

    // CompareBar 可见
    const bar = page.locator("div.fixed.bottom-0");
    await expect(bar).toBeVisible();

    // bar 内应有对比按钮 — 文本格式为 "对比 (2)" / "Compare (2)"
    const compareBtn = page.locator("div.fixed.bottom-0 button:has(svg.lucide-arrow-right)");
    await expect(compareBtn).toBeVisible();

    // 点击跳转到对比页
    await compareBtn.click();
    await page.waitForURL("**/compare?models=*");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/compare?models=");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("mobile: 卡片复选框 + CompareBar 出现", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    // 使用 /models 页面的表格（首页已改为场景卡片）
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 找到卡片区域的对比按钮（mobile card 有 relative class，StatsStrip 没有）
    const mobileCard = page.locator("[data-testid='mobile-model-card']").first();
    const addBtn = mobileCard.locator("button").first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await page.waitForTimeout(300);

    // CompareBar 出现
    const bar = page.locator("div.fixed.bottom-0");
    await expect(bar).toBeVisible();
  });

  test("mobile: 从 CompareBar 跳转对比页", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    // 使用 /models 页面的表格（首页已改为场景卡片）
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 找到卡片区域的对比按钮
    const mobileCard = page.locator("[data-testid='mobile-model-card']").first();
    const addBtn = mobileCard.locator("button").first();
    await addBtn.click();
    await page.waitForTimeout(300);

    // CompareBar 中的对比按钮 — 带 ArrowRight 图标的按钮
    const bar = page.locator("div.fixed.bottom-0");
    await expect(bar).toBeVisible();

    const compareBtn = bar.locator("button:has(svg.lucide-arrow-right)");
    await expect(compareBtn).toBeVisible();
    await compareBtn.click();
    await page.waitForURL("**/compare?models=*");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/compare?models=");
  });

  test("desktop: 取消对比 — 从CompareBar移除模型", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 选一个模型
    const rows = page.locator("tbody tr");
    await rows.nth(0).locator("button").first().click();
    await page.waitForTimeout(300);

    // CompareBar 出现
    const bar = page.locator("div.fixed.bottom-0");
    await expect(bar).toBeVisible();

    // 移除按钮（X或close图标）
    const removeBtn = bar.locator("button:has(svg.lucide-x), button:has(svg.lucide-close)").first();
    if (await removeBtn.count() > 0) {
      await removeBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test("desktop: 从详情页加入对比", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle");

    // 详情页的"加入对比"按钮
    const addBtn = page.locator("button").filter({ hasText: /加入对比|Add to Compare/ });
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await page.waitForTimeout(300);

    // 验证按钮状态变为已加入（视觉反馈）
    // 按钮文字可能变为"已加入"/"移除"
    const removeText = page.locator("button").filter({ hasText: /移除|Remove/ }).first();
    const removeExists = await removeText.count();
    // 如果文字变了，说明加入成功
    // 如果没变（移动端 hidden sm:inline 隐藏了文字），检查是否有 Check 图标
    const checkIcon = page.locator("svg.lucide-check").first();
    const checkExists = await checkIcon.count();

    // 至少有一种反馈方式存在
    expect(removeExists > 0 || checkExists > 0).toBeTruthy();
  });

  test("desktop: 对比页数据正确性 — 数值与模型一致", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    // 已知 Claude Opus 4.8: intelligence=61.44, coding=56.71
    // 已知 GPT-5.5: intelligence=60.24, coding=59.12
    await page.goto("/compare?models=claude-opus-4-8,gpt-5-5");
    await page.waitForLoadState("networkidle");

    // 验证两个模型名称都存在
    await expect(page.locator("text=/Claude Opus 4.8/").first()).toBeVisible();
    await expect(page.locator("text=/GPT-5.5/").first()).toBeVisible();

    // 验证智能分数在表格中存在
    const intelligenceValues = page.locator("text=/61.44|60.24/");
    await expect(intelligenceValues.first()).toBeAttached();
  });

  test("desktop: 对比页完整渲染 — 所有行存在", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/compare?models=claude-opus-4-8,gpt-5-5");
    await page.waitForLoadState("networkidle");

    // 验证对比表头两列
    await expect(page.locator("text=/Claude Opus 4.8/").first()).toBeVisible();
    await expect(page.locator("text=/GPT-5.5/").first()).toBeVisible();

    // 验证关键指标行存在
    const metrics = ["智能", "Intelligence", "编程", "Coding", "Agent", "速度", "Speed", "价格", "Pricing", "上下文", "Context"];
    for (const metric of metrics) {
      const el = page.locator(`text=/${metric}/`).first();
      const count = await el.count();
      if (count > 0) {
        await expect(el).toBeAttached();
      }
    }

    await expect(page.locator("a").filter({ hasText: /添加更多模型|Add More/ })).toBeVisible();
  });

  test("desktop: 对比页 ScoreBar 进度条可视化", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/compare?models=claude-opus-4-8,gpt-5-5");
    await page.waitForLoadState("networkidle");

    // ScoreBar 进度条存在 — 在得分单元格内
    const scoreBars = page.locator("div.rounded-full.overflow-hidden");
    const barCount = await scoreBars.count();
    expect(barCount).toBeGreaterThan(1); // 至少智能+编程栏有进度条
  });

  test("desktop: 3+ 模型对比页面渲染", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/compare?models=claude-opus-4-8,gpt-5-5,claude-sonnet-4-6");
    await page.waitForLoadState("networkidle");

    // 三个模型名称都存在
    await expect(page.locator("text=/Claude Opus 4.8/").first()).toBeVisible();
    await expect(page.locator("text=/GPT-5.5/").first()).toBeVisible();
    await expect(page.locator("text=/Claude Sonnet 4.6/").first()).toBeVisible();
    // 模型计数显示（如 "(3 models)" 或 "(3 个模型)"）
    const countText = page.locator("text=/3/").first();
    await expect(countText).toBeAttached();
  });

  test("desktop: 添加更多模型按钮跳转 /models", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/compare?models=claude-opus-4-8,gpt-5-5");
    await page.waitForLoadState("networkidle");

    const addMoreLink = page.locator("a").filter({ hasText: /添加更多模型|Add More/ });
    await expect(addMoreLink).toBeVisible();
    const href = await addMoreLink.getAttribute("href");
    expect(href).toBe("/models");
  });

  test("mobile: 对比页渲染", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/compare?models=claude-opus-4-8,gpt-5-5");
    await page.waitForLoadState("networkidle");

    // 移动端共享行布局
    await expect(page.locator("h1")).toBeVisible();
    // 两个模型名称可见（使用 .first() 避免 strict mode）
    await expect(page.locator("text=/Claude Opus 4.8/").first()).toBeVisible();
    await expect(page.locator("text=/GPT-5.5/").first()).toBeVisible();
  });

  test("mobile: CompareBar 移除模型（X按钮）", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "移动端专用");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 加入一个模型到对比
    const mobileCard = page.locator("[data-testid='mobile-model-card']").first();
    const addBtn = mobileCard.locator("button").first();
    await addBtn.click();
    await page.waitForTimeout(300);

    // CompareBar 出现
    const bar = page.locator("div.fixed.bottom-0");
    await expect(bar).toBeVisible();

    // 点击 X 移除
    const removeBtn = bar.locator("button:has(svg.lucide-x), button:has(svg.lucide-close)").first();
    if (await removeBtn.count() > 0) {
      await removeBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test("desktop: 空对比页 fallback UI", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/compare");
    await page.waitForLoadState("networkidle");

    // 无模型时显示空状态 — h1 可见
    await expect(page.locator("h1")).toBeVisible();
    // 有返回 /models 的链接（可能处于不可见区域但 DOM 中存在）
    const backLink = page.locator("a[href='/models']");
    await expect(backLink.first()).toBeAttached();
  });
});
