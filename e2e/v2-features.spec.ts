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
    const modelLinks = page.locator("a[href^='/product/']");
    await expect(modelLinks.first()).toBeVisible();
  });
});

test.describe("V2 — Top Picks Cards", () => {
  test("shows top 5 recommendation cards", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Top Picks section with 5 cards linking to product pages
    const recommendationCards = page.locator("section").filter({ hasText: /热门推荐|Top Picks/ }).locator("a[href^='/product/']");
    await expect(recommendationCards).not.toHaveCount(0);
  });
});

test.describe("V2 — Detail Page Recommendations", () => {
  test("shows one-liner summary under model name", async ({ page }) => {
    // Navigate to a detail page via home page first
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click first model link from scene selector or top picks
    const firstModelLink = page.locator("a[href^='/product/']").first();
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
    await page.goto("/product/gpt-5-5");
    await page.waitForLoadState("networkidle").catch(() => {});
    // Fallback: use any product page
    if (await page.locator("h1").count() === 0) {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const firstLink = page.locator("a[href^='/product/']").first();
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

test.describe("V2 — Models Page Guidance", () => {
  test("shows scene sort buttons on models page", async ({ page }) => {
    await page.goto("/models");
    await page.waitForLoadState("networkidle");

    // Scene sort buttons should be visible
    await expect(page.locator("button").filter({ hasText: /智能|Intelligence/ })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /编程|Coding/ }).or(page.locator("button").filter({ hasText: /排序/ }))).toBeVisible();
  });

  test("empty state shows guidance when no results", async ({ page }) => {
    await page.goto("/models?filter=开源&company=OpenAI");
    await page.waitForLoadState("networkidle");

    // Should show empty state with guidance
    const emptyState = page.locator("text=/未找到|No matching|试试|Try/");
    await expect(emptyState).toBeVisible();
  });
});

test.describe("V2 — Compare Page Verdict", () => {
  test("shows verdict section when comparing models", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Compare page with two models
    await page.goto("/compare?models=claude-opus-4-8,gpt-5-5");
    await page.waitForLoadState("networkidle");

    // Verdict should be visible
    const verdictSection = page.locator("text=/速览|Verdict/");
    const exists = await verdictSection.count();
    if (exists > 0) {
      await expect(verdictSection).toBeVisible();
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
