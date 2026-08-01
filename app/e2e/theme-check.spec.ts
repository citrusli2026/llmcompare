import { test, expect } from "@playwright/test";

// 项目已锁定亮色主题（layout themeScript 强制给 <html> 加 light class，
// ThemeProvider 是 light-only 空实现，无任何暗色切换入口）。
// 这组测试守住"亮色锁定"这一约定，防止暗色模式意外回归。

const LIGHT = /(?:^|\s)light(?:\s|$)/;
const DARK = /(?:^|\s)dark(?:\s|$)/;

test.describe("Light Theme — 亮色主题锁定", () => {
  test("各核心页面 <html> 始终有 light class、无 dark class", async ({ page }) => {
    for (const path of ["/", "/models", "/about"]) {
      await page.goto(path);
      const html = page.locator("html");
      await expect(html).toHaveClass(LIGHT);
      await expect(html).not.toHaveClass(DARK);
    }
  });

  test("localStorage 写入 dark 后刷新仍为 light", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
    });
    // 刷新后 themeScript 重新执行，dark 不应复活
    await page.reload();
    const html = page.locator("html");
    await expect(html).toHaveClass(LIGHT);
    await expect(html).not.toHaveClass(DARK);
    // 页面内容正常渲染
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("亮色主题下无页面脚本错误", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("html")).toHaveClass(LIGHT);

    expect(errors).toEqual([]);
  });
});
