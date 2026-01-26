import { render, screen, fireEvent } from "@testing-library/react";

import { Summary } from "../Summary";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatAmount: (value) => `fmt-${value}`,
  }),
}));

jest.mock("../hooks/usePaymentMethod", () => ({
  usePaymentMethods: () => ({
    paymentMethods: [
      { id: "cash", name: "Cash" },
      { id: "btc", name: "BTC" },
    ],
  }),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const NumberInput = ({ label, value, onChange }) => (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
  const Select = ({ label, selectedKeys, onSelectionChange, children, isDisabled }) => (
    <select
      aria-label={label}
      disabled={isDisabled}
      value={selectedKeys?.[0] || ""}
      onChange={(e) => onSelectionChange?.(new Set([e.target.value]))}
    >
      <option value="">placeholder</option>
      {children}
    </select>
  );
  const SelectItem = ({ value, children }) => (
    <option value={value}>{children}</option>
  );
  return { ...actual, NumberInput, Select, SelectItem };
});

jest.mock("../BitcoinPaymentModal", () => ({
  BitcoinPaymentModal: ({ isOpen }) => (isOpen ? <div>btc-modal</div> : null),
}));

jest.mock("../CashPaymentModal", () => ({
  CashPaymentModal: ({ isOpen }) => (isOpen ? <div>cash-modal</div> : null),
}));

jest.mock("../CardPaymentModal", () => ({
  CardPaymentModal: ({ isOpen }) => (isOpen ? <div>card-modal</div> : null),
}));

const cartItems = [
  {
    id: 1,
    name: "Jade Wallet",
    price: 1000,
    quantity: 2,
    subtotal: 2000,
  },
];

describe("Summary", () => {
  it("renders totals and handles remove/update actions", () => {
    const onRemoveProduct = jest.fn();
    const onUpdateQuantity = jest.fn();

    render(
      <Summary
        cartItems={cartItems}
        discount={10}
        onRemoveProduct={onRemoveProduct}
        onUpdateQuantity={onUpdateQuantity}
        onPay={jest.fn()}
        isPaying={false}
        paymentError=""
        onClearPaymentError={jest.fn()}
      />,
    );

    expect(screen.getByText("summary.title")).toBeInTheDocument();
    expect(screen.getAllByText("fmt-2000")).toHaveLength(2);
    expect(screen.getByText("fmt-200")).toBeInTheDocument();
    expect(screen.getByText("fmt-1800")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Remove Product"));
    expect(onRemoveProduct).toHaveBeenCalledWith(1);

    fireEvent.change(screen.getByLabelText("summary.quantity"), {
      target: { value: "3" },
    });
    expect(onUpdateQuantity).toHaveBeenCalledWith(1, 3);
  });

  it("selects payment method, clears error, and calls onPay", () => {
    const onPay = jest.fn();
    const onClearPaymentError = jest.fn();

    render(
      <Summary
        cartItems={cartItems}
        discount={0}
        onRemoveProduct={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onPay={onPay}
        isPaying={false}
        paymentError="error"
        onClearPaymentError={onClearPaymentError}
      />,
    );

    fireEvent.change(screen.getByLabelText("summary.paymentMethodLabel"), {
      target: { value: "cash" },
    });
    expect(onClearPaymentError).toHaveBeenCalled();

    fireEvent.click(screen.getByText("summary.pay"));
    expect(onPay).toHaveBeenCalledWith(
      expect.objectContaining({
        items: cartItems,
        subtotal: 2000,
        discount: 0,
        discountAmount: 0,
        total: 2000,
        selectedPaymentMethod: "cash",
      }),
    );
  });

  it("disables pay button when cart is empty and shows error", () => {
    render(
      <Summary
        cartItems={[]}
        discount={0}
        onRemoveProduct={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onPay={jest.fn()}
        isPaying={false}
        paymentError="payment.error"
        onClearPaymentError={jest.fn()}
      />,
    );

    expect(screen.getByText("payment.error")).toBeInTheDocument();
    expect(screen.getByText("summary.pay")).toBeDisabled();
  });

  it("handles missing cartItems with empty fallback", () => {
    render(
      <Summary
        cartItems={undefined}
        discount={0}
        onRemoveProduct={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onPay={jest.fn()}
        isPaying={false}
        paymentError=""
        onClearPaymentError={jest.fn()}
      />,
    );

    expect(screen.getByText("summary.pay")).toBeDisabled();
  });

  it("renders payment modals when configs exist", () => {
    render(
      <Summary
        cartItems={cartItems}
        discount={0}
        onRemoveProduct={jest.fn()}
        onUpdateQuantity={jest.fn()}
        onPay={jest.fn()}
        isPaying={false}
        paymentError=""
        onClearPaymentError={jest.fn()}
        btcPaymentConfig={{ paymentId: "btc-1" }}
        cashPaymentConfig={{ paymentId: "cash-1" }}
        cardPaymentConfig={{ paymentId: "card-1" }}
      />,
    );

    expect(screen.getByText("btc-modal")).toBeInTheDocument();
    expect(screen.getByText("cash-modal")).toBeInTheDocument();
    expect(screen.getByText("card-modal")).toBeInTheDocument();
  });
});
