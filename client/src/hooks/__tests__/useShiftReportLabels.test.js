import { renderHook } from "@testing-library/react";

import { useShiftReportLabels } from "@/hooks/useShiftReportLabels";

jest.mock("next-intl", () => ({
  useTranslations: (namespace) => (key) => `${namespace}.${key}`,
}));

describe("useShiftReportLabels", () => {
  it("returns the translated labels printed on the Z report", () => {
    const { result: shiftReportLabelsHook } = renderHook(() => useShiftReportLabels());

    expect(shiftReportLabelsHook.current).toEqual(expect.objectContaining({
      title: "ticketPrint.shiftReport.title",
      cashier: "ticketPrint.shiftReport.cashier",
      expectedCash: "ticketPrint.shiftReport.expectedCash",
      countedCash: "ticketPrint.shiftReport.countedCash",
      difference: "ticketPrint.shiftReport.difference",
    }));
  });

  it("translates the known payment method names keyed in lowercase", () => {
    const { result: shiftReportLabelsHook } = renderHook(() => useShiftReportLabels());

    expect(shiftReportLabelsHook.current.paymentMethods).toEqual(expect.objectContaining({
      cash: "paymentMethods.cash",
      "credit card": "paymentMethods.creditCard",
    }));
  });
});
