"use client";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CardPaymentModal } from "../CardPaymentModal";

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

describe("CardPaymentModal", () => {
  const baseProps = {
    isOpen: true,
    amountDue: 10,
    displayTotal: "$10.00",
    onClose: jest.fn(),
    onComplete: jest.fn(),
    methodLabel: "Credit Card",
  };

  it("renders title, total, and method label", () => {
    render(<CardPaymentModal {...baseProps} />);
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("$10.00")).toBeInTheDocument();
    expect(screen.getAllByText("Credit Card")).toHaveLength(2);
  });

  it("calls onClose when cancel is pressed", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<CardPaymentModal {...baseProps} onClose={onClose} />);

    await user.click(screen.getByText("cancel"));

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onComplete when confirm is pressed", async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    render(<CardPaymentModal {...baseProps} onComplete={onComplete} />);

    await user.click(screen.getByText("confirm"));

    expect(onComplete).toHaveBeenCalled();
  });

  it("uses default method label when none is provided", () => {
    render(<CardPaymentModal {...baseProps} methodLabel={undefined} />);
    expect(screen.getAllByText("defaultMethod")).toHaveLength(2);
  });

  it("formats amount due when displayTotal is missing", () => {
    render(<CardPaymentModal {...baseProps} displayTotal={undefined} amountDue={12.5} />);
    expect(screen.getByText("$12.50")).toBeInTheDocument();
  });
});
