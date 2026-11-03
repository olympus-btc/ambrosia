import { addToast } from "@heroui/react";
import { act, renderHook } from "@testing-library/react";

import { useOrderReceiptReprint } from "../useOrderReceiptReprint";

let mockHasCustomerPrinter;
let mockLoadingConfigs;
const mockPrintCustomerReceipt = jest.fn(() => Promise.resolve(true));

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (translationKey) => translationKey,
}));

jest.mock("../../../hooks/useCustomerReceipt", () => ({
  useCustomerReceipt: () => ({
    printCustomerReceipt: mockPrintCustomerReceipt,
    hasCustomerPrinter: mockHasCustomerPrinter,
    loadingConfigs: mockLoadingConfigs,
  }),
}));

const paidOrder = {
  id: "order-1",
  status: "paid",
  total: 12.5,
  discountAmount: 150,
  tipAmount: 1.25,
  paymentMethod: "Cash",
  createdAt: "2026-10-10T15:18:00",
  items: [{ productName: "Orange", quantity: 2, priceAtOrder: 700 }],
};

beforeEach(() => {
  mockPrintCustomerReceipt.mockClear();
  addToast.mockClear();
  mockHasCustomerPrinter = true;
  mockLoadingConfigs = false;
});

describe("useOrderReceiptReprint", () => {
  it("reprints the order with its sale date and amounts in cents", async () => {
    const { result: reprintHook } = renderHook(() => useOrderReceiptReprint(paidOrder));

    await act(() => reprintHook.current.reprintReceipt());

    expect(mockPrintCustomerReceipt).toHaveBeenCalledWith({
      items: [{ name: "Orange", quantity: 2, price: 700 }],
      totalCents: 1250,
      discountAmountCents: 150,
      tipAmountCents: 125,
      paymentMethodName: "Cash",
      issuedAt: "2026-10-10T15:18:00",
    });
  });

  it("shows a success toast when the receipt is printed", async () => {
    const { result: reprintHook } = renderHook(() => useOrderReceiptReprint(paidOrder));

    await act(() => reprintHook.current.reprintReceipt());

    expect(addToast).toHaveBeenCalledWith({ color: "success", description: "details.reprintSuccess" });
  });

  it("does not show a success toast when printing fails", async () => {
    mockPrintCustomerReceipt.mockResolvedValueOnce(false);
    const { result: reprintHook } = renderHook(() => useOrderReceiptReprint(paidOrder));

    await act(() => reprintHook.current.reprintReceipt());

    expect(addToast).not.toHaveBeenCalled();
  });

  it("allows reprinting paid and refunded orders", () => {
    const { result: paidHook } = renderHook(() => useOrderReceiptReprint(paidOrder));
    const { result: refundedHook } = renderHook(() => useOrderReceiptReprint({ ...paidOrder, status: "refunded" }));

    expect(paidHook.current.canReprint).toBe(true);
    expect(refundedHook.current.canReprint).toBe(true);
  });

  it("does not allow reprinting open orders", () => {
    const { result: reprintHook } = renderHook(() => useOrderReceiptReprint({ ...paidOrder, status: "open" }));

    expect(reprintHook.current.canReprint).toBe(false);
  });

  it("does not allow reprinting without an enabled customer printer", async () => {
    mockHasCustomerPrinter = false;
    const { result: reprintHook } = renderHook(() => useOrderReceiptReprint(paidOrder));

    await act(() => reprintHook.current.reprintReceipt());

    expect(reprintHook.current.canReprint).toBe(false);
    expect(mockPrintCustomerReceipt).not.toHaveBeenCalled();
  });

  it("does not allow reprinting while printer configs are loading", () => {
    mockLoadingConfigs = true;
    const { result: reprintHook } = renderHook(() => useOrderReceiptReprint(paidOrder));

    expect(reprintHook.current.canReprint).toBe(false);
  });

  it("does not allow reprinting without an order", () => {
    const { result: reprintHook } = renderHook(() => useOrderReceiptReprint(null));

    expect(reprintHook.current.canReprint).toBe(false);
  });
});
