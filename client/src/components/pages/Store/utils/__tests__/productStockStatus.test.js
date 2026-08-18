import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  getProductStockQuantity,
  getProductStockStatus,
  getStockChipClassName,
  isStockTracked,
  PRODUCT_STOCK_STATUS,
  UNTRACKED_STOCK_LIMIT,
} from "../productStockStatus";

describe("isStockTracked", () => {
  it("treats products without the flag as tracked", () => {
    expect(isStockTracked({})).toBe(true);
    expect(isStockTracked({ trackStock: undefined })).toBe(true);
    expect(isStockTracked(undefined)).toBe(true);
  });

  it("only untracks when the flag is explicitly false", () => {
    expect(isStockTracked({ trackStock: false })).toBe(false);
    expect(isStockTracked({ trackStock: true })).toBe(true);
  });
});

describe("getProductStockStatus", () => {
  it("returns untracked before looking at the quantity", () => {
    expect(getProductStockStatus({ trackStock: false, quantity: 0 })).toBe(PRODUCT_STOCK_STATUS.UNTRACKED);
    expect(getProductStockStatus({ trackStock: false, quantity: 50 })).toBe(PRODUCT_STOCK_STATUS.UNTRACKED);
  });

  it("keeps the quantity based statuses for tracked products", () => {
    expect(getProductStockStatus({ quantity: 0 })).toBe(PRODUCT_STOCK_STATUS.OUT);
    expect(getProductStockStatus({ quantity: DEFAULT_LOW_STOCK_THRESHOLD - 1 })).toBe(PRODUCT_STOCK_STATUS.LOW);
    expect(getProductStockStatus({ quantity: DEFAULT_LOW_STOCK_THRESHOLD })).toBe(PRODUCT_STOCK_STATUS.OK);
  });
});

describe("getStockChipClassName", () => {
  it("returns a neutral chip for untracked products", () => {
    const untrackedChipClassName = getStockChipClassName(PRODUCT_STOCK_STATUS.UNTRACKED);

    expect(untrackedChipClassName).toContain("bg-gray-100");
    expect(untrackedChipClassName).not.toContain("bg-rose-100");
    expect(untrackedChipClassName).not.toContain("bg-green-200");
  });
});

describe("UNTRACKED_STOCK_LIMIT", () => {
  it("survives a JSON round trip so the persisted cart keeps it", () => {
    expect(JSON.parse(JSON.stringify({ maxQuantity: UNTRACKED_STOCK_LIMIT })).maxQuantity)
      .toBe(UNTRACKED_STOCK_LIMIT);
  });
});

describe("getProductStockQuantity", () => {
  it("still reads the aggregated quantity regardless of tracking", () => {
    expect(getProductStockQuantity({ trackStock: false, quantity: 4 })).toBe(4);
  });
});
