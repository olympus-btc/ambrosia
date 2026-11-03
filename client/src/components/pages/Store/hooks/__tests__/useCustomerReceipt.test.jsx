import { addToast } from "@heroui/react";
import { renderHook } from "@testing-library/react";

import { useCustomerReceipt } from "../useCustomerReceipt";

let mockPrinterConfigs;
let mockLoadingConfigs;
const mockPrintTicket = jest.fn(() => Promise.resolve());

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (translationKey) => translationKey,
}));

jest.mock("../usePrinter", () => ({
  usePrinters: () => ({
    printTicket: mockPrintTicket,
    printerConfigs: mockPrinterConfigs,
    loadingConfigs: mockLoadingConfigs,
  }),
}));

beforeEach(() => {
  mockPrintTicket.mockClear();
  addToast.mockClear();
  mockPrinterConfigs = [{ id: "cfg-1", printerType: "CUSTOMER", enabled: true }];
  mockLoadingConfigs = false;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe("useCustomerReceipt", () => {
  it("prints a CUSTOMER ticket with mapped item data", async () => {
    const { result: receiptHook } = renderHook(() => useCustomerReceipt());

    await receiptHook.current.printCustomerReceipt({
      items: [{ name: "Jade", price: 100, quantity: 2 }],
      totalCents: 200,
      ticketId: 42,
      invoice: "ln-invoice",
    });

    expect(mockPrintTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        printerType: "CUSTOMER",
        ticketType: "RECEIPT",
        broadcast: false,
        ticketData: expect.objectContaining({
          ticketId: "42",
          total: 2,
          invoice: "ln-invoice",
          labels: { total: "labels.total", discount: "labels.discount", tip: "labels.tip", paymentMethod: "labels.paymentMethod" },
          items: [
            expect.objectContaining({ name: "Jade", price: 1, quantity: 2 }),
          ],
        }),
      }),
    );
  });

  it("sends the translated payment method name in the ticket data", async () => {
    const { result: receiptHook } = renderHook(() => useCustomerReceipt());

    await receiptHook.current.printCustomerReceipt({ items: [], totalCents: 0, ticketId: 7, paymentMethodName: "Cash" });

    expect(mockPrintTicket).toHaveBeenCalledWith(
      expect.objectContaining({ ticketData: expect.objectContaining({ paymentMethod: "cash" }) }),
    );
  });

  it("keeps a custom payment method name as is in the ticket data", async () => {
    const { result: receiptHook } = renderHook(() => useCustomerReceipt());

    await receiptHook.current.printCustomerReceipt({ items: [], totalCents: 0, ticketId: 8, paymentMethodName: "Vales" });

    expect(mockPrintTicket).toHaveBeenCalledWith(
      expect.objectContaining({ ticketData: expect.objectContaining({ paymentMethod: "Vales" }) }),
    );
  });

  it("sends the issue date so the ticket keeps the original sale date", async () => {
    const { result: receiptHook } = renderHook(() => useCustomerReceipt());

    await receiptHook.current.printCustomerReceipt({ items: [], totalCents: 0, ticketId: 9, issuedAt: "2026-10-10T15:18:00" });

    expect(mockPrintTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketData: expect.objectContaining({ date: "2026-10-10T15:18:00", issuedAt: "2026-10-10T15:18:00" }),
      }),
    );
  });

  it("does not send an issue date for a new sale", async () => {
    const { result: receiptHook } = renderHook(() => useCustomerReceipt());

    await receiptHook.current.printCustomerReceipt({ items: [], totalCents: 0, ticketId: 10 });

    expect(mockPrintTicket).toHaveBeenCalledWith(
      expect.objectContaining({ ticketData: expect.objectContaining({ issuedAt: null }) }),
    );
  });

  it("reports whether the receipt was printed", async () => {
    const { result: receiptHook } = renderHook(() => useCustomerReceipt());

    await expect(receiptHook.current.printCustomerReceipt({ items: [], totalCents: 0, ticketId: 1 })).resolves.toBe(true);

    mockPrintTicket.mockRejectedValueOnce(new Error("printer offline"));
    await expect(receiptHook.current.printCustomerReceipt({ items: [], totalCents: 0, ticketId: 1 })).resolves.toBe(false);
  });

  it("exposes whether there is an enabled customer printer", () => {
    mockPrinterConfigs = [{ id: "cfg-1", printerType: "KITCHEN", enabled: true }];
    const { result: receiptHook } = renderHook(() => useCustomerReceipt());

    expect(receiptHook.current.hasCustomerPrinter).toBe(false);
  });

  it("does not print when there is no enabled customer printer", async () => {
    mockPrinterConfigs = [{ id: "cfg-1", printerType: "KITCHEN", enabled: true }];
    const { result: receiptHook } = renderHook(() => useCustomerReceipt());

    await receiptHook.current.printCustomerReceipt({ items: [], totalCents: 0, ticketId: 1 });

    expect(mockPrintTicket).not.toHaveBeenCalled();
  });

  it("does not print while printer configs are still loading", async () => {
    mockLoadingConfigs = true;
    const { result: receiptHook } = renderHook(() => useCustomerReceipt());

    await receiptHook.current.printCustomerReceipt({ items: [], totalCents: 0, ticketId: 1 });

    expect(mockPrintTicket).not.toHaveBeenCalled();
  });

  it("shows a warning toast when customer receipt printing fails", async () => {
    mockPrintTicket.mockRejectedValueOnce(new Error("printer offline"));
    const { result: receiptHook } = renderHook(() => useCustomerReceipt());

    await receiptHook.current.printCustomerReceipt({
      items: [{ name: "Jade", price: 100, quantity: 2 }],
      totalCents: 200,
      ticketId: 42,
    });

    expect(addToast).toHaveBeenCalledWith({
      color: "warning",
      description: "errors.printCustomer",
    });
  });
});
