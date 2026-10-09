import { fireEvent, render, screen } from "@testing-library/react";

import { InvoicesCard } from "../InvoicesCard";

jest.mock("next-intl", () => ({
  useTranslations: () => (translationKey) => translationKey,
}));

jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress }) => <button type="button" onClick={onPress}>{children}</button>,
  Card: ({ children }) => <div>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Chip: ({ children }) => <span>{children}</span>,
}));

const invoice = {
  id: "invoice-1",
  invoiceNumber: "2026-0001",
  clientName: "Acme",
  periodStart: "2026-10-01",
  periodEnd: "2026-10-31",
  status: "draft",
  paymentMethod: "bank",
  totalCents: 12500,
  currencyAcronym: "USD",
};

describe("InvoicesCard", () => {
  it("shows invoice summary details", () => {
    render(<InvoicesCard invoice={invoice} onViewInvoice={jest.fn()} />);

    expect(screen.getByText("2026-0001")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("statuses.draft")).toBeInTheDocument();
    expect(screen.getByText("paymentMethods.bank")).toBeInTheDocument();
    expect(screen.getByText("USD 125.00")).toBeInTheDocument();
  });

  it("calls onViewInvoice when the view button is pressed", () => {
    const viewInvoice = jest.fn();

    render(<InvoicesCard invoice={invoice} onViewInvoice={viewInvoice} />);
    fireEvent.click(screen.getByRole("button", { name: "view" }));

    expect(viewInvoice).toHaveBeenCalledWith(invoice);
  });
});
