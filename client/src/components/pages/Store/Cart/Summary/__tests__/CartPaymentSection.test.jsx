import { render, screen, fireEvent } from "@testing-library/react";

import { CartPaymentSection } from "../CartPaymentSection";

jest.mock("../../hooks/usePaymentMethod", () => ({
  usePaymentMethods: () => ({
    paymentMethods: [
      { id: "cash", name: "Cash" },
      { id: "btc", name: "BTC" },
    ],
  }),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  return {
    ...actual,
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

const defaultProps = {
  isPaying: false,
  isDisabled: false,
  paymentError: "",
  onClearPaymentError: jest.fn(),
  onPay: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CartPaymentSection", () => {
  it("selects BTC as default payment method", () => {
    render(<CartPaymentSection {...defaultProps} />);
    expect(screen.getByLabelText("summary.paymentMethodLabel")).toHaveValue("btc");
  });

  it("calls onPay with the selected payment method when Pay is pressed", () => {
    const onPay = jest.fn();
    render(<CartPaymentSection {...defaultProps} onPay={onPay} />);
    fireEvent.click(screen.getByText("summary.pay"));
    expect(onPay).toHaveBeenCalledWith("btc");
  });

  it("shows payment error when provided", () => {
    render(<CartPaymentSection {...defaultProps} paymentError="payment.error" />);
    expect(screen.getByText("payment.error")).toBeInTheDocument();
  });

  it("calls onClearPaymentError when payment method changes", () => {
    const onClearPaymentError = jest.fn();
    render(<CartPaymentSection {...defaultProps} onClearPaymentError={onClearPaymentError} />);
    fireEvent.change(screen.getByLabelText("summary.paymentMethodLabel"), { target: { value: "cash" } });
    expect(onClearPaymentError).toHaveBeenCalled();
  });

  it("disables Pay button when isDisabled is true", () => {
    render(<CartPaymentSection {...defaultProps} isDisabled />);
    expect(screen.getByText("summary.pay")).toBeDisabled();
  });
});
