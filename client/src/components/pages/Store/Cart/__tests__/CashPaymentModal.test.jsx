"use client";

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CashPaymentModal } from "../CashPaymentModal";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatAmount: (cents) => (typeof cents === "number"
      ? `$${(cents / 100).toFixed(2)}`
      : String(cents)),
  }),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  return {
    ...actual,
    NumberInput: ({ label, value, onValueChange, minValue, startContent, size, ...props }) => (
      <input
        type="number"
        aria-label={label}
        value={value}
        onChange={(e) => onValueChange?.(parseFloat(e.target.value) || 0)}
        min={minValue}
        {...props}
      />
    ),
  };
});

describe("CashPaymentModal", () => {
  const baseProps = {
    isOpen: true,
    amountDue: 10,
    displayTotal: "$10.00",
    onClose: jest.fn(),
    onComplete: jest.fn(),
  };

  it("renders title and total", () => {
    render(<CashPaymentModal {...baseProps} />);
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("$10.00")).toBeInTheDocument();
  });

  it("shows error when cash is insufficient", async () => {
    const user = userEvent.setup();
    render(<CashPaymentModal {...baseProps} />);

    const input = screen.getByLabelText("receivedLabel");
    fireEvent.change(input, { target: { value: "5" } });
    await user.click(screen.getByText("confirm"));

    expect(screen.getByText("errors.insufficient")).toBeInTheDocument();
  });

  it("calls onComplete with cashReceived and change when sufficient", async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    render(<CashPaymentModal {...baseProps} onComplete={onComplete} />);

    const input = screen.getByLabelText("receivedLabel");
    fireEvent.change(input, { target: { value: "15" } });
    await user.click(screen.getByText("confirm"));

    expect(onComplete).toHaveBeenCalledWith({
      cashReceived: 15,
      change: 5,
    });
  });
});
