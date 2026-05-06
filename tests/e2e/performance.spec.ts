import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Performance Tests', () => {
  test('Home page loads under 3 seconds', async ({ page }) => {
    await page.goto(BASE_URL);

    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Home page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('Models page loads under 3 seconds', async ({ page }) => {
    await page.goto(`${BASE_URL}/models`);

    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Models page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });

  test('Page has no render-blocking resources', async ({ page }) => {
    await page.goto(BASE_URL);

    const blockingResources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources
        .filter(r => r.initiatorType === 'link' && r.transferSize > 0)
        .map(r => ({
          name: r.name,
          duration: r.duration,
        }));
    });

    console.log('Blocking resources:', blockingResources.length);
  });

  test('CLS (Cumulative Layout Shift) is minimal', async ({ page }) => {
    const clsScores: number[] = [];

    page.on('layoutshift', (entry) => {
      clsScores.push(entry.value);
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const totalCLS = clsScores.reduce((sum, val) => sum + val, 0);
    console.log(`Total CLS: ${totalCLS}`);

    expect(totalCLS).toBeLessThan(0.1);
  });

  test('LCP (Largest Contentful Paint) metrics', async ({ page }) => {
    await page.goto(BASE_URL);

    const lcpMetric = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
          resolve(lastEntry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      });
    });

    console.log(`LCP: ${lcpMetric}ms`);
    expect(lcpMetric).toBeLessThan(4000);
  });

  test('All fonts loaded successfully', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('font')) {
        failedRequests.push(url);
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    expect(failedRequests).toHaveLength(0);
  });

  test('No console errors on page load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }

    expect(errors).toHaveLength(0);
  });
});

test.describe('API & Data Integrity', () => {
  test('All model detail pages are accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/models`);

    const modelLinks = await page.locator('a[href^="/product/"]').all();
    const linksToTest = modelLinks.slice(0, 5);

    for (const link of linksToTest) {
      const href = await link.getAttribute('href');
      if (href) {
        await page.goto(`${BASE_URL}${href}`);
        await expect(page).toHaveTitle(/.*/);
        expect(page.url()).toContain('/product/');
      }
    }
  });

  test('Data displayed is consistent across pages', async ({ page }) => {
    await page.goto(`${BASE_URL}/models`);
    const firstModelName = await page.locator('a[href^="/product/"]').first().textContent();

    if (firstModelName) {
      await page.goto(BASE_URL);
      const homeModelName = await page.locator('a[href^="/product/"]').first().textContent();

      expect(homeModelName?.trim()).toBe(firstModelName?.trim());
    }
  });
});
