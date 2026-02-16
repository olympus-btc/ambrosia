import { test as base, expect } from "@playwright/test";

/**
 * Authenticated page fixture.
 * Navigates to /auth, selects any available user, enters PIN via number pad,
 * clicks login, and waits for redirect.
 */
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    // Select user from the Employees dropdown
    const userSelect = page.locator('[aria-label="Employees"]');
    await expect(userSelect).toBeVisible({ timeout: 10000 });
    await userSelect.click();

    // Pick the first available user (skip "No hay Empleados")
    const option = page
      .locator("li[role='option'], [data-key]")
      .filter({ hasNotText: /No hay/ })
      .first();
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();

    // Enter PIN: 0000 via number pad
    for (let i = 0; i < 4; i++) {
      await page.locator("button").filter({ hasText: /^0$/ }).click();
    }

    // Click the login button (gradient-forest class or contains LogIn icon)
    const loginBtn = page
      .locator("button.gradient-forest")
      .first();
    await expect(loginBtn).toBeVisible({ timeout: 3000 });
    await loginBtn.click();

    // Wait for redirect away from /auth
    await page.waitForURL((url) => !url.pathname.includes("/auth"), {
      timeout: 15000,
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect };
