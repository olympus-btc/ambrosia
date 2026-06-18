import {
  classifyPaymentMethod,
  PAYMENT_KIND,
} from "../paymentKinds";

describe("classifyPaymentMethod", () => {
  it("classifies BTC methods", () => {
    expect(classifyPaymentMethod("BTC")).toBe(PAYMENT_KIND.BTC);
    expect(classifyPaymentMethod("Bitcoin btc")).toBe(PAYMENT_KIND.BTC);
  });

  it("classifies cash methods in english and spanish", () => {
    expect(classifyPaymentMethod("Cash")).toBe(PAYMENT_KIND.CASH);
    expect(classifyPaymentMethod("Efectivo")).toBe(PAYMENT_KIND.CASH);
  });

  it("classifies card methods", () => {
    expect(classifyPaymentMethod("Credit Card")).toBe(PAYMENT_KIND.CARD);
    expect(classifyPaymentMethod("Debit")).toBe(PAYMENT_KIND.CARD);
    expect(classifyPaymentMethod("Card")).toBe(PAYMENT_KIND.CARD);
  });

  it("falls back to direct for unknown methods", () => {
    expect(classifyPaymentMethod("Bank Transfer")).toBe(PAYMENT_KIND.DIRECT);
    expect(classifyPaymentMethod("")).toBe(PAYMENT_KIND.DIRECT);
    expect(classifyPaymentMethod()).toBe(PAYMENT_KIND.DIRECT);
  });
});
