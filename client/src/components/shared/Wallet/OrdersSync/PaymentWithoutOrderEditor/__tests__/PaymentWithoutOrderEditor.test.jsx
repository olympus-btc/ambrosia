const mockUsePaymentWithoutOrderEditor = jest.fn();
jest.mock("../hooks/usePaymentWithoutOrderEditor", () => ({
  usePaymentWithoutOrderEditor: (...args) => mockUsePaymentWithoutOrderEditor(...args),
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({ formatAmount: (cents) => `$${(cents / 100).toFixed(2)}` }),
}));

jest.mock("@/components/pages/Store/Cart/SearchProducts", () => ({
  SearchProducts: ({ onAddProduct }) => (
    <button data-testid="search-products" onClick={() => onAddProduct({ id: "product-1", name: "Coffee" })}>
      search
    </button>
  ),
}));

jest.mock("@/components/pages/Store/Cart/Summary/CartItemCard", () => ({
  CartItemCard: ({ item, onRemove, onUpdateQuantity }) => (
    <div data-testid={`cart-item-${item.id}`}>
      <span>{item.name}</span>
      <button onClick={onRemove}>remove-{item.id}</button>
      <button onClick={() => onUpdateQuantity(item.id, 9)}>update-{item.id}</button>
    </div>
  ),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider } from "@i18n/I18nProvider";

import { PaymentWithoutOrderEditor } from "../PaymentWithoutOrderEditor";

function buildEditorState(editorStateOverrides = {}) {
  return {
    resolvedItems: [],
    unresolvedPurchasedItems: [],
    isAutoResolving: false,
    historicalFiatAmountCents: null,
    currentCatalogTotalCents: 0,
    isConfirming: false,
    confirmPaymentError: null,
    canConfirm: false,
    resolvePurchasedItem: jest.fn(),
    discardUnresolvedPurchasedItem: jest.fn(),
    addNewItem: jest.fn(),
    updateItemQuantity: jest.fn(),
    removeItem: jest.fn(),
    confirm: jest.fn(),
    ...editorStateOverrides,
  };
}

function renderEditor(editorStateOverrides = {}) {
  const editorState = buildEditorState(editorStateOverrides);
  mockUsePaymentWithoutOrderEditor.mockReturnValue(editorState);
  const onConfirmed = jest.fn();
  const onCancel = jest.fn();
  render(
    <I18nProvider>
      <PaymentWithoutOrderEditor
        payment={{ paymentHash: "hash-1", receivedSat: 21000, completedAt: 0, purchasedItems: [] }}
        products={[]}
        categories={[]}
        currencyAcronym="usd"
        currencyId="currency-1"
        paymentMethodId="method-1"
        userId="user-1"
        onConfirmed={onConfirmed}
        onCancel={onCancel}
      />
    </I18nProvider>,
  );
  return { editorState, onConfirmed, onCancel };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PaymentWithoutOrderEditor", () => {
  it("shows the auto-resolving message while matching purchased items", () => {
    renderEditor({ isAutoResolving: true });

    expect(screen.getByText("ordersSync.paymentWithoutOrderEditor.autoResolving")).toBeInTheDocument();
  });

  it("lists every unresolved purchased item with assign and discard actions", () => {
    const purchasedItem = { name: "Unknown dish", variantName: null, quantity: 2 };
    renderEditor({ unresolvedPurchasedItems: [purchasedItem] });

    expect(screen.getByText("2x Unknown dish")).toBeInTheDocument();
  });

  it("discards an unresolved purchased item", async () => {
    const purchasedItem = { name: "Unknown dish", variantName: null, quantity: 2 };
    const { editorState } = renderEditor({ unresolvedPurchasedItems: [purchasedItem] });

    await userEvent.click(screen.getByText("ordersSync.paymentWithoutOrderEditor.discardButton"));

    expect(editorState.discardUnresolvedPurchasedItem).toHaveBeenCalledWith(purchasedItem);
  });

  it("resolves an unresolved purchased item with the product picked from the search modal", async () => {
    const purchasedItem = { name: "Unknown dish", variantName: null, quantity: 2 };
    const { editorState } = renderEditor({ unresolvedPurchasedItems: [purchasedItem] });

    await userEvent.click(screen.getByText("ordersSync.paymentWithoutOrderEditor.assignButton"));
    await userEvent.click(screen.getByTestId("search-products"));

    expect(editorState.resolvePurchasedItem).toHaveBeenCalledWith(
      purchasedItem,
      { id: "product-1", name: "Coffee" },
      undefined,
    );
  });

  it("adds a new item with the product picked from the search modal", async () => {
    const { editorState } = renderEditor();

    await userEvent.click(screen.getByText("ordersSync.paymentWithoutOrderEditor.addProductButton"));
    await userEvent.click(screen.getByTestId("search-products"));

    expect(editorState.addNewItem).toHaveBeenCalledWith({ id: "product-1", name: "Coffee" }, undefined);
  });

  it("renders a CartItemCard for every resolved item and forwards remove/update", async () => {
    const resolvedItem = { id: "item-1", name: "Coffee", quantity: 1, subtotal: 2100 };
    const { editorState } = renderEditor({ resolvedItems: [resolvedItem] });

    expect(screen.getByTestId("cart-item-item-1")).toBeInTheDocument();

    await userEvent.click(screen.getByText("update-item-1"));
    expect(editorState.updateItemQuantity).toHaveBeenCalledWith("item-1", 9);

    await userEvent.click(screen.getByText("remove-item-1"));
    expect(editorState.removeItem).toHaveBeenCalledWith("item-1");
  });

  it("shows the catalog total and the historical total to record", () => {
    renderEditor({ currentCatalogTotalCents: 2100, historicalFiatAmountCents: 1900 });

    expect(screen.getByText("$21.00")).toBeInTheDocument();
    expect(screen.getByText("$19.00")).toBeInTheDocument();
  });

  it("disables the confirm button while canConfirm is false", () => {
    renderEditor({ canConfirm: false });

    expect(screen.getByText("ordersSync.paymentWithoutOrderEditor.confirmButton").closest("button")).toBeDisabled();
  });

  it("disables the cancel button while the order is confirming", () => {
    renderEditor({ isConfirming: true });

    expect(screen.getByText("ordersSync.paymentWithoutOrderEditor.cancelButton").closest("button")).toBeDisabled();
  });

  it("confirms and reports the result through onConfirmed", async () => {
    const checkoutResult = { orderId: "order-1" };
    const { onConfirmed } = renderEditor({ canConfirm: true, confirm: jest.fn().mockResolvedValue(checkoutResult) });

    await userEvent.click(screen.getByText("ordersSync.paymentWithoutOrderEditor.confirmButton"));

    expect(onConfirmed).toHaveBeenCalledWith(checkoutResult);
  });

  it("shows the confirm error message when present", () => {
    renderEditor({ confirmPaymentError: new Error("failed") });

    expect(screen.getByText("ordersSync.paymentWithoutOrderEditor.confirmError")).toBeInTheDocument();
  });

  it("calls onCancel when the cancel button is pressed", async () => {
    const { onCancel } = renderEditor();

    await userEvent.click(screen.getByText("ordersSync.paymentWithoutOrderEditor.cancelButton"));

    expect(onCancel).toHaveBeenCalled();
  });
});
