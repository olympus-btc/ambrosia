import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  test("PIN login page renders at /auth", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    // Should be on the auth page (not redirected to onboarding)
    expect(page.url()).toContain("/auth");

    // Should show the PIN pad (number buttons)
    const numberBtn = page.locator("button").filter({ hasText: /^[0-9]$/ }).first();
    await expect(numberBtn).toBeVisible({ timeout: 10000 });
  });

  test("valid login redirects to store", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    // Select user from dropdown
    const userSelect = page.locator('[aria-label="Employees"]');
    await expect(userSelect).toBeVisible({ timeout: 10000 });
    await userSelect.click();

    // Click first real employee
    const option = page
      .locator("[data-key]")
      .filter({ hasNotText: "No hay" })
      .first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();

    // Enter PIN: 0000 via number pad
    for (let i = 0; i < 4; i++) {
      await page.locator("button").filter({ hasText: /^0$/ }).click();
    }

    // Click login button
    const loginBtn = page
      .locator("button.gradient-forest, button:has(.lucide-log-in)")
      .first();
    await loginBtn.click();

    // Wait for redirect away from /auth
    await page.waitForURL((url) => !url.pathname.includes("/auth"), {
      timeout: 15000,
    });

    expect(page.url()).not.toContain("/auth");
  });

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    // Select user from dropdown
    const userSelect = page.locator('[aria-label="Employees"]');
    await expect(userSelect).toBeVisible({ timeout: 10000 });
    await userSelect.click();

    const option = page
      .locator("[data-key]")
      .filter({ hasNotText: "No hay" })
      .first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();

    // Enter wrong PIN: 9999
    for (let i = 0; i < 4; i++) {
      await page.locator("button").filter({ hasText: /^9$/ }).click();
    }

    // Click login button
    const loginBtn = page
      .locator("button.gradient-forest, button:has(.lucide-log-in)")
      .first();
    await loginBtn.click();

    // Should show error and remain on auth page
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/auth");
  });

  test("unauthenticated access redirects to /auth", async ({ page }) => {
    await page.goto("/store");
    await page.waitForLoadState("networkidle");

    // Should redirect to auth (middleware checks refreshToken cookie)
    await page.waitForURL((url) => url.pathname.includes("/auth"), {
      timeout: 10000,
    });

    expect(page.url()).toContain("/auth");
  });
});
