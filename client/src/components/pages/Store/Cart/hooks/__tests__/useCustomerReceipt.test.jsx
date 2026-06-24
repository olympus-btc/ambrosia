import { renderHook } from "@testing-library/react";

import { useCustomerReceipt } from "../useCustomerReceipt";

let mockPrinterConfigs;
let mockLoadingConfigs;
const mockPrintTicket = jest.fn(() => Promise.resolve());

jest.mock("../../../hooks/usePrinter", () => ({
  usePrinters: () => ({
    printTicket: mockPrintTicket,
    printerConfigs: mockPrinterConfigs,
    loadingConfigs: mockLoadingConfigs,
  }),
}));

beforeEach(() => {
  mockPrintTicket.mockClear();
  mockPrinterConfigs = [{ id: "cfg-1", printerType: "CUSTOMER", enabled: true }];
  mockLoadingConfigs = false;
});

describe("useCustomerReceipt", () => {
  it("prints a CUSTOMER ticket with mapped item data", async () => {
    const { result } = renderHook(() => useCustomerReceipt());

    await result.current.printCustomerReceipt({
      items: [{ name: "Jade", price: 100, quantity: 2 }],
      totalCents: 200,
      ticketId: 42,
      invoice: "ln-invoice",
    });

    expect(mockPrintTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        printerType: "CUSTOMER",
        broadcast: false,
        ticketData: expect.objectContaining({
          ticketId: "42",
          total: 2,
          invoice: "ln-invoice",
          items: [
            expect.objectContaining({ name: "Jade", price: 1, quantity: 2 }),
          ],
        }),
      }),
    );
  });

  it("does not print when there is no enabled customer printer", async () => {
    mockPrinterConfigs = [{ id: "cfg-1", printerType: "KITCHEN", enabled: true }];
    const { result } = renderHook(() => useCustomerReceipt());

    await result.current.printCustomerReceipt({ items: [], totalCents: 0, ticketId: 1 });

    expect(mockPrintTicket).not.toHaveBeenCalled();
  });

  it("does not print while printer configs are still loading", async () => {
    mockLoadingConfigs = true;
    const { result } = renderHook(() => useCustomerReceipt());

    await result.current.printCustomerReceipt({ items: [], totalCents: 0, ticketId: 1 });

    expect(mockPrintTicket).not.toHaveBeenCalled();
  });
});
