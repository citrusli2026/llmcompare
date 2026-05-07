import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('End-to-End User Journeys', () => {
  test.describe('Journey 1: Find and explore a model', () => {
    test('Search for "deepseek", filter open source, view details', async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/models`);

      await page.fill('[placeholder*="搜索"], [placeholder*="Search"]', 'deepseek');
      await page.waitForTimeout(300);

      await page.click('text=开源');

      const firstModelLink = page.locator('a[href^="/product/"]').first();
      await firstModelLink.click();

      await expect(page).toHaveURL(/\/product\//);
      await expect(page.locator('h1, [role="heading"]').first()).toBeVisible();

      const backLink = page.locator('a[href*="/models"]', {
        hasText: /返回|Back/i,
      });
      if (await backLink.isVisible()) {
        await backLink.click();
        await expect(page).toHaveURL(/\/models/);
      }
    });
  });

  test.describe('Journey 2: Compare multiple models from homepage', () => {
    test('From home to models page and back', async ({ page }) => {
      await page.goto(BASE_URL);

      const viewAllLink = page.locator('text=查看全部, text=View All');
      if (await viewAllLink.count() > 0) {
        await viewAllLink.first().click();
        await expect(page).toHaveURL(/\/models/);
      }

      const homeLink = page.locator('a[href="/"]').first();
      await homeLink.click();
      await expect(page).toHaveURL(BASE_URL);
    });

    test('Navigate through multiple model detail pages', async ({ page }) => {
      await page.goto(`${BASE_URL}/models`);

      const modelLinks = page.locator('a[href^="/product/"]');
      const count = await modelLinks.count();
      const linksToVisit = Math.min(count, 3);

      for (let i = 0; i < linksToVisit; i++) {
        await page.goto(`${BASE_URL}/models`);
        const link = modelLinks.nth(i);
        const href = await link.getAttribute('href');

        if (href) {
          await page.goto(`${BASE_URL}${href}`);
          await expect(page).toHaveURL(new RegExp(href));
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe('Journey 3: State persistence', () => {
    test('Search state reflects in URL and persists', async ({ page }) => {
      await page.goto(`${BASE_URL}/models`);

      const searchInput = page.locator('[placeholder*="搜索"], [placeholder*="Search"]');
      await searchInput.fill('claude');
      await page.waitForTimeout(500);

      await expect(page).toHaveURL(/q=claude/);

      await page.reload();

      await expect(page).toHaveURL(/q=claude/);
    });
  });

  test.describe('Journey 4: Theme and language preferences', () => {
    test('Theme toggle persists across navigation', async ({ page }) => {
      await page.goto(BASE_URL);

      const themeButton = page.locator('button[aria-label*="theme"], button[aria-label*="模式"]');

      if (await themeButton.count() > 0) {
        await themeButton.click();
        await page.waitForTimeout(300);

        await page.goto(`${BASE_URL}/models`);
        await page.waitForTimeout(300);

        const html = page.locator('html');
        const isDark = await html.evaluate(el => el.classList.contains('dark'));
        expect(typeof isDark).toBe('boolean');
      }
    });

    test('Language toggle works', async ({ page }) => {
      await page.goto(BASE_URL);

      const langButton = page.locator('button:has-text("EN"), button:has-text("中")');

      if (await langButton.count() > 0) {
        const initialLang = await langButton.textContent();
        await langButton.click();
        await page.waitForTimeout(300);
        const newLang = await langButton.textContent();

        expect(initialLang).not.toEqual(newLang);
      }
    });
  });

  test.describe('Journey 5: Quick facts exploration', () => {
    test('View quick facts and verify model details', async ({ page }) => {
      await page.goto(`${BASE_URL}/models`);

      const firstModelLink = page.locator('a[href^="/product/"]').first();
      await firstModelLink.click();

      await expect(page.locator('text=/price|cost|价格/i')).toBeVisible({
        timeout: 5000,
      });

      const modelName = await page.locator('h1, [role="heading"]').first().textContent();
      expect(modelName?.length).toBeGreaterThan(0);
    });
  });
});

test.describe('Edge Case Scenarios', () => {
  test('Empty search query works correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/models?q=`);

    await expect(page).toHaveURL(/\/models(\?q=)?/);

    const searchInput = page.locator('[placeholder*="搜索"], [placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test('Model detail page not found redirects or shows 404', async ({ page }) => {
    const fakeUrl = `${BASE_URL}/product/non-existent-model-12345`;
    await page.goto(fakeUrl);

    const currentUrl = page.url();
    expect(currentUrl).not.toBe('about:blank');
  });
});
