import {
  ensureCartReady,
  normalizeAmounts,
} from "../paymentBuilders";

describe("paymentBuilders", () => {
  it("throws when required payment data is missing", () => {
    expect(() => ensureCartReady({ items: [], selectedPaymentMethod: "" })).toThrow("errors.selectMethod");
    expect(() => ensureCartReady({ items: [], selectedPaymentMethod: "cash" })).toThrow("errors.emptyCart");
    expect(() => ensureCartReady({ items: [{}], selectedPaymentMethod: "cash", userId: null, currencyId: "cur" })).toThrow("errors.noUser");
    expect(() => ensureCartReady({ items: [{}], selectedPaymentMethod: "cash", userId: "u1", currencyId: "" })).toThrow("errors.noCurrency");
  });

  it("normalizes amounts and formats total", () => {
    const formatAmount = (value) => `fmt-${value}`;
    const amounts = normalizeAmounts({
      subtotal: 2000,
      discount: 10,
      discountAmount: 200,
      tipAmount: 0,
      total: 1800,
      formatAmount,
    });

    expect(amounts).toEqual({
      subtotal: 2000,
      discount: 10,
      discountAmount: 200,
      tipAmount: 0,
      tipAmountFiat: 0,
      total: 1800,
      amountFiat: 18,
      displayTotal: "fmt-1800",
    });
  });

  it("normalizes amounts with tip included", () => {
    const formatAmount = (value) => `fmt-${value}`;
    const amounts = normalizeAmounts({
      subtotal: 2000,
      discount: 10,
      discountAmount: 200,
      tipAmount: 270,
      total: 2070,
      formatAmount,
    });

    expect(amounts).toEqual({
      subtotal: 2000,
      discount: 10,
      discountAmount: 200,
      tipAmount: 270,
      tipAmountFiat: 2.7,
      total: 2070,
      amountFiat: 20.7,
      displayTotal: "fmt-2070",
    });
  });
});
