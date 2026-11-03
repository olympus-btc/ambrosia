import { calculateCartTotals } from "../cartTotals";

const cartItems = [
  { id: 1, subtotal: 1500 },
  { id: 2, subtotal: 500 },
];

describe("calculateCartTotals", () => {
  it("sums the subtotal of every item", () => {
    const { subtotal } = calculateCartTotals(cartItems, 0);
    expect(subtotal).toBe(2000);
  });

  it("returns zero amounts for an empty cart", () => {
    expect(calculateCartTotals([], 10)).toEqual({
      subtotal: 0,
      discountAmount: 0,
      tipAmount: 0,
      total: 0,
    });
  });

  it("applies a percentage discount", () => {
    expect(calculateCartTotals(cartItems, 10)).toEqual({
      subtotal: 2000,
      discountAmount: 200,
      tipAmount: 0,
      total: 1800,
    });
  });

  it("treats a non-numeric discount as zero", () => {
    expect(calculateCartTotals(cartItems, undefined)).toEqual({
      subtotal: 2000,
      discountAmount: 0,
      tipAmount: 0,
      total: 2000,
    });
  });

  it("applies a fixed discount in display units converted to cents", () => {
    expect(calculateCartTotals(cartItems, 5, "fixed")).toEqual({
      subtotal: 2000,
      discountAmount: 500,
      tipAmount: 0,
      total: 1500,
    });
  });

  it("applies a 100% percentage discount", () => {
    expect(calculateCartTotals(cartItems, 100)).toEqual({
      subtotal: 2000,
      discountAmount: 2000,
      tipAmount: 0,
      total: 0,
    });
  });

  it("treats a non-numeric fixed discount as zero", () => {
    expect(calculateCartTotals(cartItems, undefined, "fixed")).toEqual({
      subtotal: 2000,
      discountAmount: 0,
      tipAmount: 0,
      total: 2000,
    });
  });

  it("rounds a percentage discount that would leave a fraction of a cent", () => {
    const fractionalCartItems = [{ id: 1, subtotal: 999 }];
    expect(calculateCartTotals(fractionalCartItems, 15)).toEqual({
      subtotal: 999,
      discountAmount: 150,
      tipAmount: 0,
      total: 849,
    });
  });

  it("rounds a fixed discount that would leave a fraction of a cent", () => {
    expect(calculateCartTotals(cartItems, 19.995, "fixed")).toEqual({
      subtotal: 2000,
      discountAmount: 2000,
      tipAmount: 0,
      total: 0,
    });
  });

  it("calculates tip based on discounted subtotal", () => {
    expect(calculateCartTotals(cartItems, 10, "percentage", 15, "percentage")).toEqual({
      subtotal: 2000,
      discountAmount: 200,
      tipAmount: 270,
      total: 2070,
    });
  });

  it("calculates fixed tip in dollars converted to cents", () => {
    expect(calculateCartTotals(cartItems, 10, "percentage", 3.5, "fixed")).toEqual({
      subtotal: 2000,
      discountAmount: 200,
      tipAmount: 350,
      total: 2150,
    });
  });
});
