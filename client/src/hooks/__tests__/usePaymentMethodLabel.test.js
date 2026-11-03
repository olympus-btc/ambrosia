import { renderHook } from "@testing-library/react";

import { usePaymentMethodLabel } from "../usePaymentMethodLabel";

jest.mock("next-intl", () => ({
  useTranslations: (namespace) => (key) => `${namespace}.${key}`,
}));

describe("usePaymentMethodLabel", () => {
  it("translates built-in payment method names", () => {
    const { result: paymentMethodLabelHook } = renderHook(() => usePaymentMethodLabel());

    expect(paymentMethodLabelHook.current.getPaymentMethodLabel("Bank Transfer")).toBe("paymentMethods.bankTransfer");
    expect(paymentMethodLabelHook.current.getPaymentMethodLabel("BTC")).toBe("paymentMethods.btc");
  });

  it("returns custom payment method names unchanged", () => {
    const { result: paymentMethodLabelHook } = renderHook(() => usePaymentMethodLabel());

    expect(paymentMethodLabelHook.current.getPaymentMethodLabel("Vale de despensa")).toBe("Vale de despensa");
  });

  it("returns empty values unchanged so callers can apply their own fallback", () => {
    const { result: paymentMethodLabelHook } = renderHook(() => usePaymentMethodLabel());

    expect(paymentMethodLabelHook.current.getPaymentMethodLabel(null)).toBeNull();
    expect(paymentMethodLabelHook.current.getPaymentMethodLabel("")).toBe("");
  });
});
