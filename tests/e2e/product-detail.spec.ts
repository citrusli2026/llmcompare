import { test, expect } from '@playwright/test';

test.describe('模型详情页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/product/gpt-5-5');
  });

  test('页面加载正确', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'GPT-5.5' })).toBeVisible();
  });

  test('显示 Quick Facts', async ({ page }) => {
    await expect(page.getByText(/OpenAI/)).toBeVisible();
  });

  test('显示 Benchmark 评分', async ({ page }) => {
    await expect(page.getByText(/智能评分/)).toBeVisible();
  });

  test('显示速度信息', async ({ page }) => {
    await expect(page.getByText(/速度/)).toBeVisible();
  });

  test('显示价格信息', async ({ page }) => {
    await expect(page.getByText(/\$[0-9]/)).toBeVisible();
  });

  test('返回链接可用', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /返回/ });
    await backLink.click();
    await expect(page).toHaveURL('/models');
  });

  test('外部链接存在', async ({ page }) => {
    const homepageLink = page.getByRole('link', { name: /官网/ });
    await expect(homepageLink).toBeVisible();
  });

  test('详情页 SEO 元数据', async ({ page }) => {
    await page.goto('/product/claude-opus-4-7');
    await expect(page).toHaveTitle(/Claude Opus/);
  });
});
