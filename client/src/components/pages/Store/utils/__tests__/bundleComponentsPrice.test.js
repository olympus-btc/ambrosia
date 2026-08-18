import {
  calculateComponentsPriceCents,
  resolveActiveComponentVariants,
} from "../bundleComponentsPrice";

const SIMPLE_PRODUCT = { id: "prod-a", name: "Arduino Nano", priceCents: 1500, costCents: 500 };
const OTHER_SIMPLE_PRODUCT = { id: "prod-b", name: "Breadboard", priceCents: 900, costCents: 300 };
const VARIANT_PRODUCT = { id: "prod-variant", name: "T-Shirt", priceCents: 1200, costCents: 0, hasVariants: true };
const PRODUCT_WITHOUT_PRICE = { id: "prod-no-price", name: "Sticker" };

const VARIANT_PRODUCT_DETAIL = {
  variants: [
    { id: "variant-red", priceCents: 1200, costCents: null, isActive: true },
    { id: "variant-blue", priceCents: 1400, costCents: null, isActive: true },
    { id: "variant-retired", priceCents: 100, costCents: null, isActive: false },
  ],
};

const CATALOG = new Map([
  [SIMPLE_PRODUCT.id, SIMPLE_PRODUCT],
  [OTHER_SIMPLE_PRODUCT.id, OTHER_SIMPLE_PRODUCT],
  [VARIANT_PRODUCT.id, VARIANT_PRODUCT],
  [PRODUCT_WITHOUT_PRICE.id, PRODUCT_WITHOUT_PRICE],
]);

const LOADED_COMPONENT_DETAILS = { [VARIANT_PRODUCT.id]: VARIANT_PRODUCT_DETAIL };

describe("resolveActiveComponentVariants", () => {
  it("returns only the active variants", () => {
    expect(resolveActiveComponentVariants(VARIANT_PRODUCT_DETAIL).map((variant) => variant.id))
      .toEqual(["variant-red", "variant-blue"]);
  });

  it("returns an empty list when the component detail has not loaded", () => {
    expect(resolveActiveComponentVariants(undefined)).toEqual([]);
    expect(resolveActiveComponentVariants({})).toEqual([]);
  });
});

describe("calculateComponentsPriceCents", () => {
  it("returns zero for an empty component list", () => {
    expect(calculateComponentsPriceCents([], CATALOG, {})).toBe(0);
  });

  it("sums price times quantity for simple components", () => {
    const bundleComponents = [
      { productId: "prod-a", quantity: 2 },
      { productId: "prod-b", quantity: 1 },
    ];

    expect(calculateComponentsPriceCents(bundleComponents, CATALOG, {})).toBe(3900);
  });

  it("uses the selected variant price once the component detail is loaded", () => {
    const bundleComponents = [{ productId: "prod-variant", variantId: "variant-blue", quantity: 2 }];

    expect(calculateComponentsPriceCents(bundleComponents, CATALOG, LOADED_COMPONENT_DETAILS)).toBe(2800);
  });

  it("falls back to the product price while the variant detail is still loading", () => {
    const bundleComponents = [{ productId: "prod-variant", variantId: "variant-blue", quantity: 2 }];

    expect(calculateComponentsPriceCents(bundleComponents, CATALOG, {})).toBe(2400);
  });

  it("falls back to the product price when the pinned variant is no longer active", () => {
    const bundleComponents = [{ productId: "prod-variant", variantId: "variant-retired", quantity: 1 }];

    expect(calculateComponentsPriceCents(bundleComponents, CATALOG, LOADED_COMPONENT_DETAILS)).toBe(1200);
  });

  it("skips components whose product is no longer in the catalog", () => {
    const bundleComponents = [
      { productId: "prod-deleted", quantity: 3 },
      { productId: "prod-b", quantity: 1 },
    ];

    expect(calculateComponentsPriceCents(bundleComponents, CATALOG, {})).toBe(900);
  });

  it("treats a missing price as zero", () => {
    const bundleComponents = [{ productId: "prod-no-price", quantity: 4 }];

    expect(calculateComponentsPriceCents(bundleComponents, CATALOG, {})).toBe(0);
  });

  it("counts variant components that carry no cost data", () => {
    const bundleComponents = [
      { productId: "prod-a", quantity: 1 },
      { productId: "prod-variant", variantId: "variant-red", quantity: 1 },
    ];

    expect(calculateComponentsPriceCents(bundleComponents, CATALOG, LOADED_COMPONENT_DETAILS)).toBe(2700);
  });
});
