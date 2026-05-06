import { test, expect } from '@playwright/test';

test.describe('主题切换', () => {
  test('主题切换按钮存在', async ({ page }) => {
    await page.goto('/');
    const themeToggle = page.locator('button[aria-label*="模式"]').or(page.locator('button[aria-label*="theme"]'));
    await expect(themeToggle).toBeVisible();
  });

  test('主题状态持久化到 localStorage', async ({ page }) => {
    await page.goto('/');

    const themeToggle = page.locator('button[aria-label*="模式"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      const theme = await page.evaluate(() => localStorage.getItem('theme'));
      expect(['light', 'dark']).toContain(theme);
    }
  });

  test('语言切换按钮存在', async ({ page }) => {
    await page.goto('/');
    const langToggle = page.getByRole('button', { name: /EN|中/ });
    await expect(langToggle).toBeVisible();
  });

  test('语言切换功能', async ({ page }) => {
    await page.goto('/');

    const langToggle = page.getByRole('button', { name: /EN|中/ });
    const initialLang = await langToggle.textContent();

    await langToggle.click();
    const newLang = await langToggle.textContent();

    expect(newLang).not.toBe(initialLang);
  });
});
