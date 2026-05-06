import { test, expect } from '@playwright/test';

test.describe('导航栏', () => {
  test('导航链接正确', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: /首页/ })).toHaveAttribute('href', '/');
    await expect(page.getByRole('link', { name: /模型目录/ })).toHaveAttribute('href', '/models');
    await expect(page.getByRole('link', { name: /关于/ })).toHaveAttribute('href', '/about');
  });

  test('当前页面高亮', async ({ page }) => {
    await page.goto('/');
    const homeLink = page.getByRole('link', { name: /首页/ });
    await expect(homeLink).toHaveClass(/bg-surface-hover/);
  });

  test('GitHub 链接存在', async ({ page }) => {
    await page.goto('/');
    const githubLink = page.locator('a[href*="github.com/citrusli2026/llmcompare"]');
    await expect(githubLink).toBeVisible();
  });

  test('Logo 点击返回首页', async ({ page }) => {
    await page.goto('/models');
    await page.locator('a[href="/"]').first().click();
    await expect(page).toHaveURL('/');
  });
});
