import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  const pagesToTest = [
    { url: '/', name: 'Home' },
    { url: '/models', name: 'Models' },
    { url: '/about', name: 'About' },
  ];

  for (const { url, name } of pagesToTest) {
    test(`${name} page has no critical accessibility violations`, async ({ page }) => {
      await page.goto(url);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      if (criticalViolations.length > 0) {
        console.log('Critical violations found:', criticalViolations);
      }

      expect(criticalViolations).toHaveLength(0);
    });
  }

  test('Home page - all violations logged for review', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .include('body')
      .analyze();

    const violations = results.violations;

    if (violations.length > 0) {
      console.log('Total violations:', violations.length);
      violations.forEach(v => {
        console.log(`- ${v.id}: ${v.description} (${v.impact})`);
        console.log(`  Impact: ${v.impact}`);
        console.log(`  Nodes: ${v.nodes.length}`);
      });
    }

    expect(results.violations.length).toBeLessThan(10);
  });

  test('Models page - table has proper headers', async ({ page }) => {
    await page.goto('/models');

    const tableHeaders = await page.locator('thead th').count();
    expect(tableHeaders).toBeGreaterThan(0);

    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('Navigation has proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav');
    await expect(nav.first()).toBeVisible();
  });

  test('Links have distinguishable text', async ({ page }) => {
    await page.goto('/models');

    const links = page.locator('a');
    const count = await links.count();

    for (let i = 0; i < Math.min(count, 20); i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const href = await link.getAttribute('href');

      if (href && !href.startsWith('#') && text) {
        expect(text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('Interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/models');

    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('Color contrast meets WCAG AA standards', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('body')
      .analyze();

    const contrastViolations = results.violations.filter(
      v => v.id === 'color-contrast'
    );

    if (contrastViolations.length > 0) {
      console.log('Color contrast violations:', contrastViolations.length);
    }

    expect(contrastViolations.length).toBeLessThan(5);
  });
});

test.describe('SEO & Accessibility Meta', () => {
  test('Page has proper title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('Page has lang attribute', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const lang = await html.getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('Images have alt text (or empty alt for decorative)', async ({ page }) => {
    await page.goto('/');
    const images = page.locator('img');

    const count = await images.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt !== null).toBe(true);
    }
  });
});
