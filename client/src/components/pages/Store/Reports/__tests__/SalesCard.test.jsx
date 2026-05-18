import { render, screen } from "@testing-library/react";

import { SalesCard } from "../Sales/SalesCard";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Card = ({ children, className }) => <div className={className}>{children}</div>;
  const CardBody = ({ children, className }) => <div className={className}>{children}</div>;
  return { ...actual, Card, CardBody };
});

const baseSale = {
  productName: "Widget A",
  userName: "alice",
  quantity: 2,
  priceAtOrder: 1500,
  paymentMethod: "Cash",
  saleDate: "2024-06-01T10:00:00Z",
};

describe("SalesCard", () => {
  let formatCurrency;

  beforeEach(() => {
    formatCurrency = jest.fn((cents) => `$${cents}`);
  });

  it("renders product name and user name", () => {
    render(<SalesCard sale={baseSale} formatCurrency={formatCurrency} />);
    expect(screen.getByText("Widget A")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("calls formatCurrency with priceAtOrder * quantity", () => {
    render(<SalesCard sale={baseSale} formatCurrency={formatCurrency} />);
    expect(formatCurrency).toHaveBeenCalledWith(3000);
  });

  it("renders the formatted total", () => {
    render(<SalesCard sale={baseSale} formatCurrency={formatCurrency} />);
    expect(screen.getByText("$3000")).toBeInTheDocument();
  });

  it("renders the payment method", () => {
    render(<SalesCard sale={baseSale} formatCurrency={formatCurrency} />);
    expect(screen.getByText("Cash")).toBeInTheDocument();
  });

  it("shows '-' when saleDate is null", () => {
    render(<SalesCard sale={{ ...baseSale, saleDate: null }} formatCurrency={formatCurrency} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
