import {
  classifyPaymentMethod,
  PAYMENT_METHODS,
} from "../paymentMethods";

describe("classifyPaymentMethod", () => {
  it("classifies BTC methods", () => {
    expect(classifyPaymentMethod("BTC")).toBe(PAYMENT_METHODS.BTC);
    expect(classifyPaymentMethod("Bitcoin btc")).toBe(PAYMENT_METHODS.BTC);
  });

  it("classifies cash methods in english and spanish", () => {
    expect(classifyPaymentMethod("Cash")).toBe(PAYMENT_METHODS.CASH);
    expect(classifyPaymentMethod("Efectivo")).toBe(PAYMENT_METHODS.CASH);
  });

  it("classifies card methods", () => {
    expect(classifyPaymentMethod("Credit Card")).toBe(PAYMENT_METHODS.CARD);
    expect(classifyPaymentMethod("Debit")).toBe(PAYMENT_METHODS.CARD);
    expect(classifyPaymentMethod("Card")).toBe(PAYMENT_METHODS.CARD);
  });

  it("returns null for unknown methods", () => {
    expect(classifyPaymentMethod("Bank Transfer")).toBeNull();
    expect(classifyPaymentMethod("")).toBeNull();
    expect(classifyPaymentMethod()).toBeNull();
  });
});
