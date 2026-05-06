import { test, expect } from '@playwright/test';

test.describe('模型列表页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/models');
  });

  test('页面加载正确', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /模型目录/ })).toBeVisible();
  });

  test('显示模型表格', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
  });

  test('筛选功能 - 全部', async ({ page }) => {
    const allButton = page.getByRole('button', { name: /全部/ });
    await allButton.click();
    await expect(allButton).toHaveClass(/accent-violet/);
  });

  test('筛选功能 - 开源', async ({ page }) => {
    const openButton = page.getByRole('button', { name: /开源/ });
    await openButton.click();
    await expect(openButton).toHaveClass(/accent-violet/);
  });

  test('筛选功能 - 闭源', async ({ page }) => {
    const closedButton = page.getByRole('button', { name: /闭源/ });
    await closedButton.click();
    await expect(closedButton).toHaveClass(/accent-violet/);
  });

  test('搜索功能', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索/);
    await searchInput.fill('deepseek');
    await expect(page.getByText(/DeepSeek/)).toBeVisible();
  });

  test('搜索后 URL 更新', async ({ page }) => {
    await page.goto('/models');
    const searchInput = page.getByPlaceholder(/搜索/);
    await searchInput.fill('kimi');
    await expect(page).toHaveURL(/q=kimi/);
  });

  test('清空搜索', async ({ page }) => {
    await page.goto('/models?q=test');
    const searchInput = page.getByPlaceholder(/搜索/);
    await searchInput.fill('');
    await expect(page).toHaveURL('/models');
  });

  test('排序功能 - 点击列头', async ({ page }) => {
    const intelligenceHeader = page.locator('th').filter({ hasText: /智能/ });
    await intelligenceHeader.click();
    await expect(intelligenceHeader).toHaveClass(/font-semibold/);
  });

  test('点击模型跳转到详情页', async ({ page }) => {
    const modelLink = page.locator('a[href^="/product/"]').first();
    const modelName = await modelLink.textContent();
    await modelLink.click();
    await expect(page).toHaveURL(/\/product\/.+/);
    await expect(page.getByRole('heading', { name: new RegExp(modelName!) })).toBeVisible();
  });
});
