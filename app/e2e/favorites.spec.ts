import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const isMobile = (projectName: string) => projectName === "Mobile Chrome";

// 从静态数据取两个确定有效的模型 id（ranking.json 与构建产物同源）
const ranking = JSON.parse(
  readFileSync(resolve(__dirname, "../src/data/ranking.json"), "utf-8"),
) as Array<{ id: string; name: string }>;
const VALID_ID = ranking[0].id;
const VALID_ID_2 = ranking[1].id;

test.describe("Favorites — 收藏页", () => {
  test("空收藏显示空态与前往模型目录入口", async ({ page }) => {
    await page.goto("/favorites");

    await expect(page.locator("h1").filter({ hasText: /我的收藏|My Favorites/ })).toBeVisible();
    await expect(page.getByText(/还没有收藏任何模型|No favorite models yet/)).toBeVisible();
    // 空态下有前往 /models 的入口（桌面导航栏还有一份隐藏链接，取可见的）
    await expect(page.locator("a[href='/models']").locator("visible=true").first()).toBeVisible();
    // 空收藏时没有"清空收藏"按钮
    await expect(page.locator("button").filter({ hasText: /清空收藏|Clear all/ })).toHaveCount(0);
  });

  test("desktop: 从 /models 收藏一个模型后出现在收藏页", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    await page.goto("/models");

    // 第一行收藏按钮 → 点击收藏
    const firstRow = page.locator("tbody tr[data-model-id]").first();
    const modelId = await firstRow.getAttribute("data-model-id");
    expect(modelId).toBeTruthy();
    const favBtn = firstRow.locator("button[data-cta='favorite']");
    await favBtn.click();
    await expect(favBtn).toHaveAttribute("aria-pressed", "true");

    // 收藏页出现该模型：chips 链接 + 表格行
    await page.goto("/favorites");
    await expect(page.locator(`a[href='/models/${modelId}']`).first()).toBeVisible();
    await expect(page.locator(`tbody tr[data-model-id='${modelId}']`)).toBeVisible();
    // 计数文案从空态变为已收藏 1 个
    await expect(page.getByText(/已收藏 1 个模型|1 models saved/)).toBeVisible();
  });

  test("desktop: chips 展示与清空收藏", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "桌面端专用");
    // 预置一个收藏
    await page.goto("/models");
    const firstRow = page.locator("tbody tr[data-model-id]").first();
    const modelId = await firstRow.getAttribute("data-model-id");
    await firstRow.locator("button[data-cta='favorite']").click();

    await page.goto("/favorites");
    // chip 链接指向详情页
    const chip = page.locator(`a[href='/models/${modelId}']`).first();
    await expect(chip).toBeVisible();

    // 清空收藏（confirm 对话框需接受）
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("button").filter({ hasText: /清空收藏|Clear all/ }).click();

    // 回到空态
    await expect(page.getByText(/还没有收藏任何模型|No favorite models yet/)).toBeVisible();
    await expect(page.locator(`a[href='/models/${modelId}']`)).toHaveCount(0);
    // localStorage 同步清空
    const stored = await page.evaluate(() => localStorage.getItem("llmcompare-favorites"));
    expect(JSON.parse(stored ?? "null")).toEqual([]);
  });

  test("URL 分享视图: 有效 ids 展示分享列表", async ({ page }) => {
    await page.goto(`/favorites?ids=${VALID_ID},${VALID_ID_2}`);

    await expect(page.locator("h1").filter({ hasText: /分享的收藏列表|Shared Favorites/ })).toBeVisible();
    // 两个模型的 chip 链接可见
    await expect(page.locator(`a[href='/models/${VALID_ID}']`).first()).toBeVisible();
    await expect(page.locator(`a[href='/models/${VALID_ID_2}']`).first()).toBeVisible();
    // 有导入按钮与返回我的收藏按钮
    await expect(page.locator("button").filter({ hasText: /导入到我的收藏|Import to My Favorites/ })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /返回我的收藏|Back to My Favorites/ })).toBeVisible();
  });

  test("URL 分享视图: 全部无效 id 显示分享空态", async ({ page }) => {
    await page.goto("/favorites?ids=no-such-model-zzz,another-fake-id");

    await expect(page.locator("h1").filter({ hasText: /分享的收藏列表|Shared Favorites/ })).toBeVisible();
    await expect(page.getByText(/分享链接中没有有效模型|No valid models in this shared link/)).toBeVisible();
    // 没有可导入的内容时不显示导入按钮
    await expect(page.locator("button").filter({ hasText: /导入到我的收藏|Import to My Favorites/ })).toHaveCount(0);
  });

  test("URL 分享视图: 混合 id 只展示有效模型，导入后合并到我的收藏", async ({ page }) => {
    await page.goto(`/favorites?ids=${VALID_ID},no-such-model-zzz`);

    // 无效 id 被静默过滤，只剩有效模型的 chip
    await expect(page.locator(`a[href='/models/${VALID_ID}']`).first()).toBeVisible();
    await expect(page.getByText(/no-such-model-zzz/)).toHaveCount(0);

    // 导入 → 回到我的收藏视图，模型出现在收藏中
    await page.locator("button").filter({ hasText: /导入到我的收藏|Import to My Favorites/ }).click();
    await expect(page).toHaveURL(/\/favorites$/);
    await expect(page.locator("h1").filter({ hasText: /我的收藏|My Favorites/ })).toBeVisible();
    await expect(page.locator(`a[href='/models/${VALID_ID}']`).first()).toBeVisible();
    // localStorage 已持久化
    const stored = await page.evaluate(() => localStorage.getItem("llmcompare-favorites"));
    expect(JSON.parse(stored ?? "null")).toContain(VALID_ID);
  });
});
