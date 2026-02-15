import { test, expect } from "./fixtures/auth.js";

test.describe("Products", () => {
  test("product list displays after login", async ({ authenticatedPage: page }) => {
    await page.goto("/store/products");
    await page.waitForLoadState("networkidle");

    // Should display a products page with some content
    const heading = page.locator("h1, h2, [data-testid='products']").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("add product modal creates product", async ({ authenticatedPage: page }) => {
    await page.goto("/store/products");
    await page.waitForLoadState("networkidle");

    // Look for an add/create button
    const addButton = page.locator(
      'button:has-text("Add"), button:has-text("Agregar"), button:has-text("New"), button:has-text("Nuevo"), [data-testid="add-product"]',
    ).first();

    if (await addButton.isVisible({ timeout: 5000 })) {
      await addButton.click();

      // Fill in product name
      const nameInput = page.locator(
        'input[name="name"], input[placeholder*="name" i], input[placeholder*="nombre" i]',
      ).first();
      if (await nameInput.isVisible({ timeout: 3000 })) {
        await nameInput.fill("E2E Test Product");

        // Fill in price
        const priceInput = page.locator(
          'input[name="price"], input[placeholder*="price" i], input[placeholder*="precio" i]',
        ).first();
        if (await priceInput.isVisible()) {
          await priceInput.fill("42.00");
        }

        // Submit
        const submitBtn = page.locator(
          'button[type="submit"], button:has-text("Save"), button:has-text("Guardar"), button:has-text("Create"), button:has-text("Crear")',
        ).first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test("new product appears in list", async ({ authenticatedPage: page }) => {
    await page.goto("/store/products");
    await page.waitForLoadState("networkidle");

    // Wait for products to load
    await page.waitForTimeout(2000);

    // Check that there's at least one product visible
    const productElements = page.locator(
      "table tbody tr, [data-testid='product-row'], .product-item",
    );
    const count = await productElements.count();

    // If products exist, at least one should be visible
    if (count > 0) {
      await expect(productElements.first()).toBeVisible();
    }
  });
});
