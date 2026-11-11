const mockFetchProductDetail = jest.fn();
jest.mock("@/components/pages/Store/hooks/useProductVariants", () => ({
  useProductVariants: () => ({ fetchProductDetail: mockFetchProductDetail }),
}));

jest.mock("@/services/bitcoinPriceService", () => {
  const sharedMockBitcoinPriceService = { getHistoricalBitcoinPrice: jest.fn() };
  return jest.fn(() => sharedMockBitcoinPriceService);
});

const mockConfirmPaymentWithoutOrder = jest.fn();
jest.mock("@/services/ordersSyncService", () => ({
  confirmPaymentWithoutOrder: (...args) => mockConfirmPaymentWithoutOrder(...args),
}));

import { act, renderHook, waitFor } from "@testing-library/react";

import BitcoinPriceService from "@/services/bitcoinPriceService";

import { usePaymentWithoutOrderEditor } from "../usePaymentWithoutOrderEditor";

const mockGetHistoricalBitcoinPrice = new BitcoinPriceService().getHistoricalBitcoinPrice;

function buildPayment(paymentOverrides = {}) {
  return {
    paymentHash: "hash-1",
    receivedSat: 21000,
    feeSat: 10,
    completedAt: Date.UTC(2024, 0, 15, 12, 0, 0),
    purchasedItems: [{ name: "Coffee", variantName: null, quantity: 2 }],
    ...paymentOverrides,
  };
}

function buildSimpleProduct(productOverrides = {}) {
  return {
    id: "product-1",
    name: "Coffee",
    priceCents: 2100,
    hasVariants: false,
    trackStock: false,
    ...productOverrides,
  };
}

const EDITOR_CONTEXT = {
  currencyAcronym: "usd",
  currencyId: "currency-1",
  paymentMethodId: "method-1",
  userId: "user-1",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetHistoricalBitcoinPrice.mockResolvedValue(100000);
});

describe("usePaymentWithoutOrderEditor", () => {
  it("auto-resolves a purchased item that matches a product without variants", async () => {
    const payment = buildPayment();
    const products = [buildSimpleProduct()];

    const { result: editorState } = renderHook(() => (
      usePaymentWithoutOrderEditor({ payment, products, ...EDITOR_CONTEXT })
    ));

    await waitFor(() => expect(editorState.current.isAutoResolving).toBe(false));

    expect(editorState.current.unresolvedPurchasedItems).toEqual([]);
    expect(editorState.current.resolvedItems).toHaveLength(1);
    expect(editorState.current.resolvedItems[0]).toMatchObject({
      productId: "product-1",
      variantId: null,
      quantity: 2,
      price: 2100,
      subtotal: 4200,
    });
  });

  it("auto-resolves a purchased item that matches a product with variants using the first active variant", async () => {
    const payment = buildPayment({ purchasedItems: [{ name: "Latte", variantName: null, quantity: 1 }] });
    const products = [buildSimpleProduct({ id: "product-2", name: "Latte", hasVariants: true })];
    mockFetchProductDetail.mockResolvedValue({
      options: [{ id: "option-1", values: [{ id: "value-1", value: "Large" }] }],
      variants: [
        { id: "variant-1", isActive: false, priceCents: 2500, quantity: 5, optionValueIds: ["value-1"] },
        { id: "variant-2", isActive: true, priceCents: 2800, quantity: 3, optionValueIds: ["value-1"] },
      ],
    });

    const { result: editorState } = renderHook(() => (
      usePaymentWithoutOrderEditor({ payment, products, ...EDITOR_CONTEXT })
    ));

    await waitFor(() => expect(editorState.current.isAutoResolving).toBe(false));

    expect(editorState.current.resolvedItems).toHaveLength(1);
    expect(editorState.current.resolvedItems[0]).toMatchObject({
      productId: "product-2",
      variantId: "variant-2",
      variantName: "Large",
      price: 2800,
    });
  });

  it("leaves a purchased item unresolved when no product matches its name", async () => {
    const payment = buildPayment({ purchasedItems: [{ name: "Unknown dish", variantName: null, quantity: 1 }] });

    const { result: editorState } = renderHook(() => (
      usePaymentWithoutOrderEditor({ payment, products: [], ...EDITOR_CONTEXT })
    ));

    await waitFor(() => expect(editorState.current.isAutoResolving).toBe(false));

    expect(editorState.current.resolvedItems).toEqual([]);
    expect(editorState.current.unresolvedPurchasedItems).toEqual(payment.purchasedItems);
  });

  it("resolves an unresolved purchased item with the chosen product", async () => {
    const payment = buildPayment({ purchasedItems: [{ name: "Unknown dish", variantName: null, quantity: 3 }] });

    const { result: editorState } = renderHook(() => (
      usePaymentWithoutOrderEditor({ payment, products: [], ...EDITOR_CONTEXT })
    ));

    await waitFor(() => expect(editorState.current.isAutoResolving).toBe(false));

    act(() => {
      editorState.current.resolvePurchasedItem(payment.purchasedItems[0], buildSimpleProduct({ id: "product-3" }));
    });

    expect(editorState.current.unresolvedPurchasedItems).toEqual([]);
    expect(editorState.current.resolvedItems).toHaveLength(1);
    expect(editorState.current.resolvedItems[0]).toMatchObject({ productId: "product-3", quantity: 3 });
  });

  it("discards an unresolved purchased item without resolving it", async () => {
    const payment = buildPayment({ purchasedItems: [{ name: "Unknown dish", variantName: null, quantity: 1 }] });

    const { result: editorState } = renderHook(() => (
      usePaymentWithoutOrderEditor({ payment, products: [], ...EDITOR_CONTEXT })
    ));

    await waitFor(() => expect(editorState.current.isAutoResolving).toBe(false));

    act(() => {
      editorState.current.discardUnresolvedPurchasedItem(payment.purchasedItems[0]);
    });

    expect(editorState.current.unresolvedPurchasedItems).toEqual([]);
    expect(editorState.current.resolvedItems).toEqual([]);
  });

  it("adds a brand new item not tied to any purchased item", async () => {
    const payment = buildPayment({ purchasedItems: [] });

    const { result: editorState } = renderHook(() => (
      usePaymentWithoutOrderEditor({ payment, products: [], ...EDITOR_CONTEXT })
    ));

    await waitFor(() => expect(editorState.current.isAutoResolving).toBe(false));

    act(() => {
      editorState.current.addNewItem(buildSimpleProduct({ id: "product-4" }));
    });

    expect(editorState.current.resolvedItems).toHaveLength(1);
    expect(editorState.current.resolvedItems[0]).toMatchObject({ productId: "product-4", quantity: 1 });
  });

  it("does not re-run auto-resolution when products changes identity but payment stays the same", async () => {
    const payment = buildPayment({ purchasedItems: [] });

    const { result: editorState, rerender } = renderHook(
      ({ products }) => usePaymentWithoutOrderEditor({ payment, products, ...EDITOR_CONTEXT }),
      { initialProps: { products: [] } },
    );

    await waitFor(() => expect(editorState.current.isAutoResolving).toBe(false));

    act(() => {
      editorState.current.addNewItem(buildSimpleProduct({ id: "product-6" }));
    });
    expect(editorState.current.resolvedItems).toHaveLength(1);

    rerender({ products: [] });

    expect(editorState.current.resolvedItems).toHaveLength(1);
    expect(editorState.current.isAutoResolving).toBe(false);
  });

  it("updates and removes a resolved item", async () => {
    const payment = buildPayment({ purchasedItems: [] });

    const { result: editorState } = renderHook(() => (
      usePaymentWithoutOrderEditor({ payment, products: [], ...EDITOR_CONTEXT })
    ));

    await waitFor(() => expect(editorState.current.isAutoResolving).toBe(false));

    act(() => {
      editorState.current.addNewItem(buildSimpleProduct({ id: "product-5" }));
    });
    const [addedItem] = editorState.current.resolvedItems;

    act(() => {
      editorState.current.updateItemQuantity(addedItem.id, 5);
    });
    expect(editorState.current.resolvedItems[0].quantity).toBe(5);

    act(() => {
      editorState.current.removeItem(addedItem.id);
    });
    expect(editorState.current.resolvedItems).toEqual([]);
  });

  it("loads the historical price for the payment's completedAt date and currency", async () => {
    const payment = buildPayment({ purchasedItems: [] });

    renderHook(() => usePaymentWithoutOrderEditor({ payment, products: [], ...EDITOR_CONTEXT }));

    await waitFor(() => expect(mockGetHistoricalBitcoinPrice).toHaveBeenCalledWith("15-01-2024", "usd"));
  });

  it("computes the historical fiat amount from receivedSat and the historical price", async () => {
    const payment = buildPayment({ purchasedItems: [], receivedSat: 21000 });

    const { result: editorState } = renderHook(() => (
      usePaymentWithoutOrderEditor({ payment, products: [], ...EDITOR_CONTEXT })
    ));

    await waitFor(() => expect(editorState.current.historicalFiatAmountCents).not.toBeNull());

    expect(editorState.current.historicalFiatAmountCents).toBe(2100);
  });

  it("cannot confirm while a purchased item is still unresolved", async () => {
    const payment = buildPayment({ purchasedItems: [{ name: "Unknown dish", variantName: null, quantity: 1 }] });

    const { result: editorState } = renderHook(() => (
      usePaymentWithoutOrderEditor({ payment, products: [], ...EDITOR_CONTEXT })
    ));

    await waitFor(() => expect(editorState.current.isAutoResolving).toBe(false));

    expect(editorState.current.canConfirm).toBe(false);
  });

  it("cannot confirm while the Bitcoin payment method has not loaded yet", async () => {
    const payment = buildPayment({ purchasedItems: [] });

    const { result: editorState } = renderHook(() => (
      usePaymentWithoutOrderEditor({ payment, products: [], ...EDITOR_CONTEXT, paymentMethodId: null })
    ));

    await waitFor(() => expect(editorState.current.historicalFiatAmountCents).not.toBeNull());

    expect(editorState.current.canConfirm).toBe(false);
  });

  it("confirms with a request built from the resolved items and the historical price", async () => {
    const payment = buildPayment();
    const products = [buildSimpleProduct()];
    mockConfirmPaymentWithoutOrder.mockResolvedValue({ orderId: "order-1", ticketId: "ticket-1", paymentId: "payment-1" });

    const { result: editorState } = renderHook(() => (
      usePaymentWithoutOrderEditor({ payment, products, ...EDITOR_CONTEXT })
    ));

    await waitFor(() => expect(editorState.current.canConfirm).toBe(true));

    await act(async () => {
      await editorState.current.confirm();
    });

    expect(mockConfirmPaymentWithoutOrder).toHaveBeenCalledWith({
      userId: "user-1",
      items: [{ productId: "product-1", variantId: null, quantity: 2, priceAtOrder: 2100 }],
      paymentMethodId: "method-1",
      currencyId: "currency-1",
      amount: 21,
      transactionId: "",
      satoshiAmount: 21000,
      exchangeRateAtPayment: 100000,
      paymentHash: "hash-1",
      exchangeRateCurrency: "usd",
      fiatAmountAtPayment: 21,
      discountAmount: 0,
      tipAmount: 0,
    });
  });

  it("captures the confirm error without throwing out of the hook's own state", async () => {
    const payment = buildPayment();
    const products = [buildSimpleProduct()];
    const confirmPaymentError = new Error("checkout failed");
    mockConfirmPaymentWithoutOrder.mockRejectedValue(confirmPaymentError);

    const { result: editorState } = renderHook(() => (
      usePaymentWithoutOrderEditor({ payment, products, ...EDITOR_CONTEXT })
    ));

    await waitFor(() => expect(editorState.current.canConfirm).toBe(true));

    await act(async () => {
      await editorState.current.confirm().catch(() => {});
    });

    expect(editorState.current.confirmPaymentError).toBe(confirmPaymentError);
    expect(editorState.current.isConfirming).toBe(false);
  });
});
