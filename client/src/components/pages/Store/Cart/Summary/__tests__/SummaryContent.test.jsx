import { render, screen, fireEvent } from "@testing-library/react";

import { SummaryContent } from "../SummaryContent";

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

const cartItems = [{ id: 1, name: "Jade Wallet", price: 1000, quantity: 2, subtotal: 2000 }];

const defaultProps = {
  cartItems,
  discount: 10,
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
  it("renders item name, price and subtotal", () => {
    render(<SummaryContent {...defaultProps} />);

    expect(screen.getByText("Jade Wallet")).toBeInTheDocument();
    expect(screen.getByText(/fmt-1000/)).toBeInTheDocument();
    expect(screen.getAllByText("fmt-2000")).toHaveLength(2);
  });

  it("renders computed totals with discount", () => {
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

  it("calls onUpdateQuantity when quantity changes", () => {
    const onUpdateQuantity = jest.fn();
    render(<SummaryContent {...defaultProps} onUpdateQuantity={onUpdateQuantity} />);

    fireEvent.change(screen.getByLabelText("summary.quantity"), { target: { value: "3" } });
    expect(onUpdateQuantity).toHaveBeenCalledWith(1, 3);
  });

  it("selects BTC as default payment method", () => {
    render(<SummaryContent {...defaultProps} />);

    expect(screen.getByLabelText("summary.paymentMethodLabel")).toHaveValue("btc");
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
        btcPaymentConfig={{ paymentId: "btc-1" }}
        cashPaymentConfig={{ paymentId: "cash-1" }}
        cardPaymentConfig={{ paymentId: "card-1" }}
      />,
    );

    expect(screen.getByText("btc-modal")).toBeInTheDocument();
    expect(screen.getByText("cash-modal")).toBeInTheDocument();
    expect(screen.getByText("card-modal")).toBeInTheDocument();
  });

  it("clears payment error when payment method changes", () => {
    const onClearPaymentError = jest.fn();
    render(<SummaryContent {...defaultProps} paymentError="error" onClearPaymentError={onClearPaymentError} />);

    fireEvent.change(screen.getByLabelText("summary.paymentMethodLabel"), { target: { value: "cash" } });
    expect(onClearPaymentError).toHaveBeenCalled();
  });
});
