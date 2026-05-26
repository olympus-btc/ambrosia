import { render, screen, fireEvent } from "@testing-library/react";

import { SummaryContent } from "../SummaryContent";

jest.mock("../CartTotals", () => ({
  CartTotals: ({ subtotal, discountAmount, total }) => (
    <div>
      <span>{`fmt-${subtotal}`}</span>
      <span>{`fmt-${discountAmount}`}</span>
      <span>{`fmt-${total}`}</span>
    </div>
  ),
}));

jest.mock("../CartPaymentSection", () => ({
  CartPaymentSection: ({ onPay, isDisabled, paymentError }) => (
    <div>
      {paymentError && <p>{paymentError}</p>}
      <button disabled={isDisabled} onClick={() => onPay("btc")}>
        summary.pay
      </button>
    </div>
  ),
}));

jest.mock("../CartItemCard", () => ({
  CartItemCard: ({ item, onRemove }) => (
    <div data-testid={`cart-item-${item.id}`}>
      <span>{item.name}</span>
      <button aria-label="Remove Product" onClick={onRemove} />
      <span data-testid={`summary-image-placeholder-${item.id}`} />
    </div>
  ),
}));

jest.mock("../hooks/usePendingRemoval", () => ({
  usePendingRemoval: () => ({
    pendingRemovals: new Set(),
    startRemoval: jest.fn((itemId, onConfirm) => onConfirm()),
    cancelRemoval: jest.fn(),
  }),
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({ formatAmount: (value) => `fmt-${value}` }),
}));

jest.mock("../../hooks/usePaymentMethod", () => ({
  usePaymentMethods: () => ({
    paymentMethods: [
      { id: "cash", name: "Cash" },
      { id: "btc", name: "BTC" },
    ],
  }),
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress }) => (
    <button aria-label="Remove Product" onClick={onPress} />
  ),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  return {
    ...actual,
    NumberInput: ({ label, value, onChange }) => (
      <input aria-label={label} value={value} onChange={(e) => onChange?.(e.target.value)} />
    ),
    Select: ({ label, selectedKeys, onSelectionChange, children, isDisabled }) => (
      <select
        aria-label={label}
        disabled={isDisabled}
        value={selectedKeys?.[0] || ""}
        onChange={(e) => onSelectionChange?.(new Set([e.target.value]))}
      >
        <option value="">placeholder</option>
        {children}
      </select>
    ),
    SelectItem: ({ value, children }) => <option value={value}>{children}</option>,
  };
});

jest.mock("../../BitcoinPaymentModal", () => ({
  BitcoinPaymentModal: ({ isOpen }) => (isOpen ? <div>btc-modal</div> : null),
}));

jest.mock("../../CashPaymentModal", () => ({
  CashPaymentModal: ({ isOpen }) => (isOpen ? <div>cash-modal</div> : null),
}));

jest.mock("../../CardPaymentModal", () => ({
  CardPaymentModal: ({ isOpen }) => (isOpen ? <div>card-modal</div> : null),
}));

const cartItems = [{ id: 1, imageUrl: "/uploads/jade-wallet.png", name: "Jade Wallet", price: 1000, quantity: 2, subtotal: 2000 }];

const defaultProps = {
  cartItems,
  discount: 10,
  hydrated: true,
  onRemoveProduct: jest.fn(),
  onUpdateQuantity: jest.fn(),
  onPay: jest.fn(),
  isPaying: false,
  paymentError: "",
  onClearPaymentError: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SummaryContent", () => {
  it("renders a CartItemCard for each cart item", () => {
    render(<SummaryContent {...defaultProps} />);

    expect(screen.getByTestId("cart-item-1")).toBeInTheDocument();
    expect(screen.getByText("Jade Wallet")).toBeInTheDocument();
  });

  it("passes computed totals to CartTotals", () => {
    render(<SummaryContent {...defaultProps} />);

    expect(screen.getByText("fmt-200")).toBeInTheDocument();
    expect(screen.getByText("fmt-1800")).toBeInTheDocument();
  });

  it("calls onRemoveProduct when delete is pressed", () => {
    const onRemoveProduct = jest.fn();
    render(<SummaryContent {...defaultProps} onRemoveProduct={onRemoveProduct} />);

    fireEvent.click(screen.getByLabelText("Remove Product"));
    expect(onRemoveProduct).toHaveBeenCalledWith(1);
  });

  it("calls onPay with correct data when Pay is pressed", () => {
    const onPay = jest.fn();
    const onClearPaymentError = jest.fn();
    render(<SummaryContent {...defaultProps} onPay={onPay} discount={0} onClearPaymentError={onClearPaymentError} />);

    fireEvent.click(screen.getByText("summary.pay"));
    expect(onClearPaymentError).toHaveBeenCalled();
    expect(onPay).toHaveBeenCalledWith(expect.objectContaining({
      items: cartItems,
      subtotal: 2000,
      total: 2000,
      selectedPaymentMethod: "btc",
    }));
  });

  it("disables Pay button when cart is empty", () => {
    render(<SummaryContent {...defaultProps} cartItems={[]} />);

    expect(screen.getByText("summary.pay")).toBeDisabled();
  });

  it("disables Pay button when not yet hydrated even if cart has items", () => {
    render(<SummaryContent {...defaultProps} hydrated={false} />);

    expect(screen.getByText("summary.pay")).toBeDisabled();
  });

  it("shows payment error message", () => {
    render(<SummaryContent {...defaultProps} paymentError="payment.error" />);

    expect(screen.getByText("payment.error")).toBeInTheDocument();
  });

  it("handles undefined cartItems gracefully", () => {
    render(<SummaryContent {...defaultProps} cartItems={undefined} />);

    expect(screen.getByText("summary.pay")).toBeDisabled();
  });

  it("renders payment modals when configs are provided", () => {
    render(
      <SummaryContent
        {...defaultProps}
        btcPayment={{ config: { paymentId: "btc-1" } }}
        cashPayment={{ config: { paymentId: "cash-1" } }}
        cardPayment={{ config: { paymentId: "card-1" } }}
      />,
    );

    expect(screen.getByText("btc-modal")).toBeInTheDocument();
    expect(screen.getByText("cash-modal")).toBeInTheDocument();
    expect(screen.getByText("card-modal")).toBeInTheDocument();
  });
});
