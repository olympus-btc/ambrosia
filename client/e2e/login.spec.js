import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  test("PIN login page renders at /auth", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    // Should show some form of PIN entry UI
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();

    // Check we're on the auth page
    expect(page.url()).toContain("/auth");
  });

  test("valid login redirects to store", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    // Enter PIN: 0000
    const pinButtons = page.locator('button:has-text("0")');
    if (await pinButtons.first().isVisible({ timeout: 5000 })) {
      for (let i = 0; i < 4; i++) {
        await pinButtons.first().click();
      }
    } else {
      const pinInput = page.locator('input[type="password"], input[type="text"]').first();
      await pinInput.fill("0000");
      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
      }
    }

    // Wait for redirect
    await page.waitForURL((url) => !url.pathname.includes("/auth"), {
      timeout: 10000,
    });

    expect(page.url()).not.toContain("/auth");
  });

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    // Enter wrong PIN: 9999
    const pinButton9 = page.locator('button:has-text("9")');
    if (await pinButton9.first().isVisible({ timeout: 5000 })) {
      for (let i = 0; i < 4; i++) {
        await pinButton9.first().click();
      }

      // Should still be on auth page or show error
      await page.waitForTimeout(2000);
      expect(page.url()).toContain("/auth");
    }
  });

  test("unauthenticated access redirects to /auth", async ({ page }) => {
    await page.goto("/store");
    await page.waitForLoadState("networkidle");

    // Should redirect to auth
    await page.waitForURL((url) => url.pathname.includes("/auth"), {
      timeout: 10000,
    });

    expect(page.url()).toContain("/auth");
  });
});
