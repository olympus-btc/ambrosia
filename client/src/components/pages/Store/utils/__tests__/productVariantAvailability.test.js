import {
  variantIsActive,
  variantIsAvailableForSale,
} from "../productVariantAvailability";

describe("variantIsActive", () => {
  it("treats variants as active unless isActive is explicitly false", () => {
    expect(variantIsActive({ id: "active" })).toBe(true);
    expect(variantIsActive({ id: "inactive", isActive: false })).toBe(false);
  });
});

describe("variantIsAvailableForSale", () => {
  it("requires an active variant with stock", () => {
    expect(variantIsAvailableForSale({ id: "available", quantity: 1 })).toBe(true);
    expect(variantIsAvailableForSale({ id: "inactive", isActive: false, quantity: 1 })).toBe(false);
    expect(variantIsAvailableForSale({ id: "out-of-stock", quantity: 0 })).toBe(false);
  });

  it("ignores the quantity when the owning product does not track stock", () => {
    const outOfStockVariant = { id: "out-of-stock", quantity: 0 };

    expect(variantIsAvailableForSale(outOfStockVariant, { trackStock: false })).toBe(true);
    expect(variantIsAvailableForSale(outOfStockVariant, { trackStock: true })).toBe(false);
  });

  it("still requires the variant to be active for untracked products", () => {
    expect(variantIsAvailableForSale({ id: "inactive", isActive: false, quantity: 0 }, { trackStock: false }))
      .toBe(false);
  });
});
