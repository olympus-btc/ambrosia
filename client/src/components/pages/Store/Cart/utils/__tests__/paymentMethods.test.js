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

  it("classifies bank transfer methods in english and spanish", () => {
    expect(classifyPaymentMethod("Bank Transfer")).toBe(PAYMENT_METHODS.TRANSFER);
    expect(classifyPaymentMethod("Transferencia")).toBe(PAYMENT_METHODS.TRANSFER);
    expect(classifyPaymentMethod("Wire Transfer")).toBe(PAYMENT_METHODS.TRANSFER);
    expect(classifyPaymentMethod("ACH")).toBe(PAYMENT_METHODS.TRANSFER);
  });

  it("classifies transfer methods even when the name also contains a card keyword", () => {
    expect(classifyPaymentMethod("Credit Transfer")).toBe(PAYMENT_METHODS.TRANSFER);
    expect(classifyPaymentMethod("Card Wire Transfer")).toBe(PAYMENT_METHODS.TRANSFER);
  });

  it("only matches ACH as a whole word, not as a substring", () => {
    expect(classifyPaymentMethod("Mach")).toBeNull();
    expect(classifyPaymentMethod("Attach")).toBeNull();
  });

  it("returns null for unknown methods", () => {
    expect(classifyPaymentMethod("Voucher")).toBeNull();
    expect(classifyPaymentMethod("")).toBeNull();
    expect(classifyPaymentMethod()).toBeNull();
  });
});
