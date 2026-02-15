import { test as base, expect } from "@playwright/test";

/**
 * Authenticated page fixture.
 * Navigates to /auth, enters the default admin PIN, and waits for redirect.
 */
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    // Enter PIN digits: 0000
    const pinButtons = page.locator('button:has-text("0")');
    if (await pinButtons.first().isVisible({ timeout: 5000 })) {
      for (let i = 0; i < 4; i++) {
        await pinButtons.first().click();
      }
    } else {
      // Fallback: try input field
      const pinInput = page.locator('input[type="password"], input[type="text"]').first();
      if (await pinInput.isVisible({ timeout: 3000 })) {
        await pinInput.fill("0000");
        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible({ timeout: 2000 })) {
          await submitBtn.click();
        }
      }
    }

    // Wait for redirect away from /auth
    await page.waitForURL((url) => !url.pathname.includes("/auth"), {
      timeout: 10000,
    });

    await use(page);
  },
});

export { expect };
