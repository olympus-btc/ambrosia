import { renderHook } from "@testing-library/react";

import { useHasCustomerPrinter } from "@/components/pages/Store/hooks/useHasCustomerPrinter";

let mockPrinterConfigs;
let mockLoadingConfigs;

jest.mock("@/components/pages/Store/hooks/usePrinter", () => ({
  usePrinters: () => ({ printerConfigs: mockPrinterConfigs, loadingConfigs: mockLoadingConfigs }),
}));

beforeEach(() => {
  mockPrinterConfigs = [];
  mockLoadingConfigs = false;
});

describe("useHasCustomerPrinter", () => {
  it("detects an enabled customer printer", () => {
    mockPrinterConfigs = [{ printerType: "CUSTOMER", enabled: true }];

    const { result: customerPrinterHook } = renderHook(() => useHasCustomerPrinter());

    expect(customerPrinterHook.current).toEqual({ hasCustomerPrinter: true, loadingConfigs: false });
  });

  it("ignores disabled customer printers and other printer types", () => {
    mockPrinterConfigs = [{ printerType: "CUSTOMER", enabled: false }, { printerType: "KITCHEN", enabled: true }];

    const { result: customerPrinterHook } = renderHook(() => useHasCustomerPrinter());

    expect(customerPrinterHook.current.hasCustomerPrinter).toBe(false);
  });

  it("reports while the printer configs are loading", () => {
    mockLoadingConfigs = true;

    const { result: customerPrinterHook } = renderHook(() => useHasCustomerPrinter());

    expect(customerPrinterHook.current.loadingConfigs).toBe(true);
  });
});
