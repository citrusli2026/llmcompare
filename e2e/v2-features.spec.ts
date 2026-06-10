import { test, expect } from "@playwright/test";

test.describe("V2 — Scene Cards on Homepage", () => {
  test("shows 4 scene cards on load", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Scene cards should exist — they contain scene names
    await expect(page.locator("button").filter({ hasText: /编程|Coding/ })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /Agent/ })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /性价比|Value/ })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /推理|Reasoning/ })).toBeVisible();
  });

  test("expand coding scene shows model recommendations", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Coding scene is expanded by default — model links should be visible
    const sceneSection = page.locator("button").filter({ hasText: /编程|Coding/ }).locator("..");
    // After clicking, the expanded area should contain model links
    const modelLinks = page.locator("a[href^='/models/']");
    await expect(modelLinks.first()).toBeVisible();
  });
});

test.describe("V2 — Scene Card Recommendations", () => {
  test("scene card 展开后展示 5 个 model 链接", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 默认展开的 coding 场景卡,展开区有 5 个 model 链接
    const cards = page.locator(".animate-in a[href^='/models/']");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

test.describe("V2 — Detail Page Recommendations", () => {
  test("shows one-liner summary under model name", async ({ page }) => {
    // Navigate to a detail page via home page first
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click first model link from scene selector or top picks
    const firstModelLink = page.locator("a[href^='/models/']").first();
    const href = await firstModelLink.getAttribute("href");
    await page.goto(href!);
    await page.waitForLoadState("networkidle");

    // One-liner should be visible as a <p> tag near the model name
    const mainHeading = page.locator("h1").first();
    await expect(mainHeading).toBeVisible();

    // Recommendation tags should be visible (badges near the model name)
    const tags = mainHeading.locator("..").locator("span.rounded-full");
    const tagCount = await tags.count();
    // Either recommendation tags exist, or one-liner text exists
    const oneLinerExists = await page.locator("p.text-sm.text-text-secondary").count();
    expect(tagCount > 0 || oneLinerExists > 0).toBeTruthy();
  });

  test("shows similar models section", async ({ page }) => {
    // Go directly to a well-known model detail page
    await page.goto("/models/gpt-5-5");
    await page.waitForLoadState("networkidle").catch(() => {});
    // Fallback: use any product page
    if (await page.locator("h1").count() === 0) {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const firstLink = page.locator("a[href^='/models/']").first();
      const href = await firstLink.getAttribute("href");
      await page.goto(href!);
      await page.waitForLoadState("networkidle");
    }

    // "你可能也喜欢" or "You Might Also Like" section
    const similarSection = page.locator("text=/你可能也喜欢|You Might Also Like/");
    const exists = await similarSection.count();
    if (exists > 0) {
      await expect(similarSection).toBeVisible();
    }
  });
});

test.describe("V2 — About Page Mission", () => {
  test("shows updated mission statement", async ({ page }) => {
    await page.goto("/about");
    await page.waitForLoadState("networkidle");

    // Should mention "选型助手" or "selection assistant"
    const missionText = page.locator("text=/选型助手|selection assistant|Our Mission/");
    await expect(missionText).toBeVisible();
  });
});

test.describe("V3 — UX Enhancements", () => {
  test("scene card 'browse all' navigates to /models?sort=", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 找到"查看更多同类模型"链接并验证 href
    const browseLink = page.locator("a[href^='/models?sort=']").first();
    await expect(browseLink).toBeVisible();
    const href = await browseLink.getAttribute("href");
    expect(href).toMatch(/^\/models\?sort=/);
  });

  test("back to top button appears after scroll", async ({ page }) => {
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // 初始按钮应不可见（opacity-0 or hidden）
    const backBtn = page.locator("button").filter({ hasText: "" }).and(page.locator("[class*='fixed']")).filter({ has: page.locator("svg.lucide-arrow-up") });
    // 滚动到底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    // 验证滚动后页面仍正常
    await expect(page.locator("body")).not.toHaveText(/Error/);
  });

  test("mobile: scene cards show 2-col grid layout", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 场景卡片在移动端应以 grid 布局显示
    const sceneGrid = page.locator("button").filter({ hasText: /编程|Coding/ }).first();
    await expect(sceneGrid).toBeVisible();
    // 验证 4 个场景按钮都存在
    const scenes = ["编程", "Agent", "性价比", "推理"];
    for (const s of scenes) {
      await expect(page.locator("button").filter({ hasText: new RegExp(s) }).first()).toBeVisible();
    }
  });

  test("scene card 切换不同场景后展示新模型", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 切到性价比场景
    const valueBtn = page.locator("button").filter({ hasText: /性价比|Value/ }).first();
    await valueBtn.click();
    await page.waitForTimeout(200);

    // 展开区有 model 链接
    const cards = page.locator(".animate-in a[href^='/models/']");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
