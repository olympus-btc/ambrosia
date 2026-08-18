import { buildRequestPayload } from "../buildRequestPayload";

const trackedProductForm = {
  productId: "prod-1",
  productName: "Cafe",
  productDescription: "Caliente",
  productCategories: ["cat-1"],
  productSKU: "SKU-1",
  productPrice: 10.5,
  productStock: 7,
  productMinStock: 2,
  productMaxStock: 40,
  hasVariants: false,
  isBundle: false,
  trackStock: true,
};

describe("buildRequestPayload", () => {
  it("defaults trackStock to true when the form does not carry the flag", () => {
    const { trackStock, ...formWithoutFlag } = trackedProductForm;

    expect(buildRequestPayload(formWithoutFlag, null).trackStock).toBe(true);
    expect(trackStock).toBe(true);
  });

  it("keeps the stock fields for a tracked product", () => {
    const payload = buildRequestPayload(trackedProductForm, null);

    expect(payload).toMatchObject({
      trackStock: true,
      quantity: 7,
      minStockThreshold: 2,
      maxStockThreshold: 40,
    });
  });

  it("zeroes the stock fields when tracking is disabled", () => {
    const payload = buildRequestPayload({ ...trackedProductForm, trackStock: false }, null);

    expect(payload).toMatchObject({
      trackStock: false,
      quantity: 0,
      minStockThreshold: 0,
      maxStockThreshold: 0,
    });
  });

  it("keeps zeroing the quantity for bundles that still track stock", () => {
    const payload = buildRequestPayload({ ...trackedProductForm, isBundle: true }, null);

    expect(payload).toMatchObject({ trackStock: true, quantity: 0, isBundle: true, hasVariants: false });
  });

  it("keeps a bundle tracked even when the form carries a stale disabled flag", () => {
    const payload = buildRequestPayload({ ...trackedProductForm, isBundle: true, trackStock: false }, null);

    expect(payload).toMatchObject({ trackStock: true, quantity: 0, isBundle: true });
  });

  it("includes the id only when requested", () => {
    expect(buildRequestPayload(trackedProductForm, null)).not.toHaveProperty("id");
    expect(buildRequestPayload(trackedProductForm, null, { includeId: true }).id).toBe("prod-1");
  });
});
