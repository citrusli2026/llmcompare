const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const log = (label, data) => console.log(`[${label}] ${JSON.stringify(data)}`);

  // ── Issue 1: Search box + company filter on mobile ──
  console.log("\n═══ ISSUE 1: Search box + company filter on mobile ═══");
  await page.goto("http://localhost:3003/models", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Company select
  const companySelect = page.locator("select").first();
  log("company-select-visible", await companySelect.isVisible());
  log("company-select-rect", await companySelect.boundingBox());

  // Search input
  const searchInput = page.locator('input[placeholder*="搜索"]').first();
  log("search-input-visible", await searchInput.isVisible());
  const searchRect = await searchInput.boundingBox();
  log("search-input-rect", searchRect);
  if (searchRect) log("search-input-width", searchRect.width);

  // Check if search and select are side by side on same row
  // If both are on same row at 375px, they'd overlap or be too narrow
  log("select-and-search-side-by-side", "checking...");

  // ── Issue 2: Company column text truncation ──
  console.log("\n═══ ISSUE 2: Company column truncation ═══");
  // On mobile it should be cards, not table - let's check
  const mobileCards = await page.locator('[data-testid="mobile-model-card"]').count();
  const desktopRows = await page.locator('[data-testid="model-row"]').count();
  log("layout-mode", { mobileCards, desktopRows });

  // Check actual rendered content for company names
  const bodyText = await page.locator("body").innerText();
  const companyNames = ["DeepSeek", "MiniMax", "InclusionAI", "Anthropic", "OpenAI", "Tencent", "Alibaba", "Google", "xAI", "Kimi", "Cohere", "StepFun"];
  const truncChecks = {};
  for (const name of companyNames) {
    truncChecks[name] = bodyText.includes(name);
  }
  log("company-names-present", truncChecks);

  // ── Issue 3: Compare checkbox on mobile ──
  console.log("\n═══ ISSUE 3: Compare checkbox on mobile ═══");
  await page.goto("http://localhost:3003/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Check mobile cards on homepage
  const homeMobileCards = await page.locator('[data-testid="mobile-model-card"]').count();
  const homeTables = await page.locator("table").count();
  log("home-layout", { mobileCards: homeMobileCards, tables: homeTables });

  // Check compare buttons
  const compareBtns = page.locator('button:has-text("加入对比")');
  const compareBtnCount = await compareBtns.count();
  log("compare-button-count", compareBtnCount);

  if (compareBtnCount > 0) {
    const btn = compareBtns.first();
    const btnRect = await btn.boundingBox();
    log("compare-button-rect", btnRect);
    if (btnRect) log("compare-touch-target-too-small", btnRect.width < 44 || btnRect.height < 44);
  }

  // Check if there's a visible CompareBar
  log("has-compare-bar-text", bodyText.includes("对比 ("));
  log("has-selected-text", bodyText.includes("已选"));

  // ── Issue 4: Click compare and check CompareBar ──
  console.log("\n═══ ISSUE 4: Compare after selection ═══");
  if (compareBtnCount >= 2) {
    // On mobile the buttons might be hidden (desktop table not rendered)
    // Try clicking via evaluate
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      let clicked = 0;
      for (const btn of btns) {
        if (btn.textContent?.includes("加入对比") && clicked < 3) {
          btn.click();
          clicked++;
        }
      }
    });
    await page.waitForTimeout(500);
  }

  const bodyAfter = await page.locator("body").innerText();
  log("after-selection", {
    hasCompareText: bodyAfter.includes("对比"),
    url: page.url(),
  });

  // ── Issue 5: Score Overview colors ──
  console.log("\n═══ ISSUE 5: Score Overview colors ═══");
  await page.goto("http://localhost:3003/product/gpt-5-5", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const hasScoreOverview = await page.locator("body").innerText();
  log("score-overview-heading", hasScoreOverview.includes("Score Overview"));

  const bars = await page.evaluate(() => {
    const container = document.querySelector('[class*="rounded-xl"][class*="bg-surface-card"]');
    if (!container) return [];
    const fillDivs = container.querySelectorAll('[class*="rounded-full"]');
    return Array.from(fillDivs).slice(0, 10).map(el => {
      const style = el.getAttribute("style") || "";
      const cls = el.className || "";
      const siblingText = el.parentElement?.previousElementSibling?.textContent?.trim() || "";
      const parentText = el.closest('[class*="flex"]')?.textContent?.trim() || "";
      return {
        classes: cls.substring(0, 60),
        width: style,
        text: parentText,
      };
    });
  });
  log("score-bars", bars);

  // ── Issue 6: CompareBar presence on the compare page ──
  console.log("\n═══ Issue 6: Compare page Best Value highlight ═══");
  await page.goto("http://localhost:3003/compare?models=minimax-m3,claude-opus-4-8,gpt-5-5", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Check if there's a highlight for best value
  const compareBody = await page.locator("body").innerText();
  log("compare-body-has-best", compareBody.includes("最佳"));

  // Take a screenshot for final visual
  await page.screenshot({ path: "/tmp/mobile-compare-375.png", fullPage: true });
  log("screenshot-saved", "/tmp/mobile-compare-375.png");

  await browser.close();
  console.log("\n═══ VERIFICATION COMPLETE ═══");
})();
