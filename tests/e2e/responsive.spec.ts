import { test, expect } from '@playwright/test';

test.describe('响应式设计', () => {
  test('桌面端显示表格', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page.locator('table')).toBeVisible();
  });

  test('移动端隐藏表格', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const table = page.locator('table');
    await expect(table).toBeHidden();
  });

  test('移动端显示卡片', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const cards = page.locator('[class*="rounded-xl border"]');
    await expect(cards.first()).toBeVisible();
  });

  test('导航在移动端自适应', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const menuButton = page.locator('button[aria-label*="menu" i]');
    await expect(menuButton).toBeVisible();
  });
});
