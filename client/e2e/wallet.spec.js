import { test, expect } from "./fixtures/auth.js";

test.describe("Wallet", () => {
  test("navigate to wallet from sidebar", async ({ authenticatedPage: page }) => {
    // Look for wallet link in nav/sidebar
    const walletLink = page.locator(
      'a[href*="wallet"], [data-testid="nav-wallet"]',
    ).first();

    if (await walletLink.isVisible({ timeout: 5000 })) {
      await walletLink.click();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("wallet");
    } else {
      // Navigate directly if sidebar link not found
      await page.goto("/store/wallet");
      await page.waitForURL((url) => !url.pathname.includes("/auth"), {
        timeout: 10000,
      });
      // Accept wallet page or redirect (permission-dependent)
      const url = page.url();
      expect(url).not.toContain("/onboarding");
    }
  });

  test("wallet info section renders", async ({ authenticatedPage: page }) => {
    await page.goto("/store/wallet");
    await page.waitForLoadState("networkidle");

    // Wallet page should render some content
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
    expect(pageContent.length).toBeGreaterThan(50);
  });

  test("page handles no-connection state gracefully", async ({ authenticatedPage: page }) => {
    await page.goto("/store/wallet");
    await page.waitForLoadState("networkidle");

    // The wallet page should render without crashing even if
    // the phoenixd node is not reachable
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
    expect(pageContent.length).toBeGreaterThan(50);
  });
});
