import {
  ensureCartReady,
  normalizeAmounts,
} from "../paymentBuilders";

describe("paymentBuilders", () => {
  const t = (key) => key;

  it("throws when required payment data is missing", () => {
    expect(() => ensureCartReady({ t, items: [], selectedPaymentMethod: "" })).toThrow("errors.selectMethod");
    expect(() => ensureCartReady({ t, items: [], selectedPaymentMethod: "cash" })).toThrow("errors.emptyCart");
    expect(() => ensureCartReady({ t, items: [{}], selectedPaymentMethod: "cash", userId: null, currencyId: "cur" })).toThrow("errors.noUser");
    expect(() => ensureCartReady({ t, items: [{}], selectedPaymentMethod: "cash", userId: "u1", currencyId: "" })).toThrow("errors.noCurrency");
  });

  it("normalizes amounts and formats total", () => {
    const formatAmount = (value) => `fmt-${value}`;
    const amounts = normalizeAmounts({
      subtotal: 2000,
      discount: 10,
      discountAmount: 200,
      total: 1800,
      formatAmount,
    });

    expect(amounts).toEqual({
      subtotal: 2000,
      discount: 10,
      discountAmount: 200,
      total: 1800,
      amountFiat: 18,
      displayTotal: "fmt-1800",
    });
  });
});
