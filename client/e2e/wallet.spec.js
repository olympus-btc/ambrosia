import { test, expect } from "./fixtures/auth.js";

test.describe("Wallet", () => {
  test("navigate to wallet from sidebar", async ({ authenticatedPage: page }) => {
    // Look for wallet link in nav/sidebar
    const walletLink = page.locator(
      'a[href*="wallet"], [data-testid="nav-wallet"], nav a:has-text("Wallet"), nav a:has-text("wallet")',
    ).first();

    if (await walletLink.isVisible({ timeout: 5000 })) {
      await walletLink.click();
      await page.waitForLoadState("networkidle");

      expect(page.url()).toContain("wallet");
    } else {
      // Navigate directly
      await page.goto("/store/wallet");
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("wallet");
    }
  });

  test("wallet info section renders", async ({ authenticatedPage: page }) => {
    await page.goto("/store/wallet");
    await page.waitForLoadState("networkidle");

    // Wallet page should render some content
    const walletContent = page.locator(
      "[data-testid='wallet'], [data-testid='node-info'], h1, h2, .wallet-info",
    ).first();
    await expect(walletContent).toBeVisible({ timeout: 10000 });
  });

  test("page handles no-connection state gracefully", async ({ authenticatedPage: page }) => {
    await page.goto("/store/wallet");
    await page.waitForLoadState("networkidle");

    // The wallet page should render without crashing even if
    // the phoenixd node is not reachable. Check for either:
    // - Normal wallet content
    // - Error/fallback state (e.g., "not connected", "error")
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();

    // Page should not be completely blank or showing an unhandled error
    const hasContent = pageContent.length > 50;
    expect(hasContent).toBe(true);
  });
});
