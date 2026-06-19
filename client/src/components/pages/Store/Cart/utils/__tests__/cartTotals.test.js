import { calculateCartTotals } from "../cartTotals";

const items = [
  { id: 1, subtotal: 1500 },
  { id: 2, subtotal: 500 },
];

describe("calculateCartTotals", () => {
  it("sums the subtotal of every item", () => {
    const { subtotal } = calculateCartTotals(items, 0);
    expect(subtotal).toBe(2000);
  });

  it("returns zero amounts for an empty cart", () => {
    expect(calculateCartTotals([], 10)).toEqual({
      subtotal: 0,
      discountAmount: 0,
      total: 0,
    });
  });

  it("applies a percentage discount", () => {
    expect(calculateCartTotals(items, 10)).toEqual({
      subtotal: 2000,
      discountAmount: 200,
      total: 1800,
    });
  });

  it("treats a non-numeric discount as zero", () => {
    expect(calculateCartTotals(items, undefined)).toEqual({
      subtotal: 2000,
      discountAmount: 0,
      total: 2000,
    });
  });
});
