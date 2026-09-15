"use client";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TransferPaymentModal } from "../TransferPaymentModal";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatAmount: (cents) => (typeof cents === "number"
      ? `$${(cents / 100).toFixed(2)}`
      : String(cents)),
  }),
}));

describe("TransferPaymentModal", () => {
  const baseProps = {
    isOpen: true,
    amountDue: 10,
    displayTotal: "$10.00",
    onClose: jest.fn(),
    onComplete: jest.fn(),
    methodLabel: "Bank Transfer",
  };

  it("renders title, total, and method label", () => {
    render(<TransferPaymentModal {...baseProps} />);
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("$10.00")).toBeInTheDocument();
    expect(screen.getByText("Bank Transfer")).toBeInTheDocument();
  });

  it("calls onClose when cancel is pressed", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<TransferPaymentModal {...baseProps} onClose={onClose} />);

    await user.click(screen.getByText("cancel"));

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onComplete with the trimmed reference when confirm is pressed", async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    render(<TransferPaymentModal {...baseProps} onComplete={onComplete} />);

    await user.type(screen.getByLabelText("referenceLabel"), "  REF-123  ");
    await user.click(screen.getByText("confirm"));

    expect(onComplete).toHaveBeenCalledWith({ reference: "REF-123" });
  });

  it("uses default method label when none is provided", () => {
    render(<TransferPaymentModal {...baseProps} methodLabel={undefined} />);
    expect(screen.getByText("defaultMethod")).toBeInTheDocument();
  });

  it("formats amount due when displayTotal is missing", () => {
    render(<TransferPaymentModal {...baseProps} displayTotal={undefined} amountDue={12.5} />);
    expect(screen.getByText("$12.50")).toBeInTheDocument();
  });

  it("clears the reference input when reopened", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TransferPaymentModal {...baseProps} isOpen={false} />);
    rerender(<TransferPaymentModal {...baseProps} isOpen />);

    const input = screen.getByLabelText("referenceLabel");
    await user.type(input, "REF-1");
    expect(input).toHaveValue("REF-1");

    rerender(<TransferPaymentModal {...baseProps} isOpen={false} />);
    rerender(<TransferPaymentModal {...baseProps} isOpen />);

    expect(screen.getByLabelText("referenceLabel")).toHaveValue("");
  });
});
