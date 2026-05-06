import { test, expect } from '@playwright/test';

test.describe('首页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('页面标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/模型图鉴/);
  });

  test('显示 Hero 区域', async ({ page }) => {
    await expect(page.getByText('国内大模型数据，整理在一起')).toBeVisible();
  });

  test('显示模型排行榜', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
  });

  test('显示导航栏', async ({ page }) => {
    await expect(page.getByRole('link', { name: /首页/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /模型目录/ })).toBeVisible();
  });

  test('点击模型名称跳转详情页', async ({ page }) => {
    const modelLink = page.locator('a[href^="/product/"]').first();
    await modelLink.click();
    await expect(page).toHaveURL(/\/product\/.+/);
  });

  test('点击查看全部跳转模型列表页', async ({ page }) => {
    const viewAllLink = page.getByText('查看全部');
    if (await viewAllLink.isVisible()) {
      await viewAllLink.click();
      await expect(page).toHaveURL('/models');
    }
  });
});
