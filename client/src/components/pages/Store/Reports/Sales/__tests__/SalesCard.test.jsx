import { render, screen } from "@testing-library/react";

import { SalesCard } from "../SalesCard";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Card = ({ children, className }) => <div className={className}>{children}</div>;
  const CardBody = ({ children, className }) => <div className={className}>{children}</div>;
  return { ...actual, Card, CardBody };
});

jest.mock("@/components/shared/AmountDisplay", () => ({
  AmountDisplay: ({ satoshis }) => <span>{`amount-display-${satoshis}`}</span>,
}));

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

  it("renders AmountDisplay for BTC sales with satoshiAmount", () => {
    const btcSale = {
      ...baseSale,
      paymentMethod: "BTC",
      satoshiAmount: 100000,
      exchangeRateAtPayment: 95000,
      exchangeRateCurrency: "usd",
      fiatAmountAtPayment: 1.0,
    };
    render(<SalesCard sale={btcSale} formatCurrency={formatCurrency} currentRate={95000} />);
    expect(screen.getByText("amount-display-100000")).toBeInTheDocument();
    expect(formatCurrency).not.toHaveBeenCalledWith(3000);
  });

  it("uses formatCurrency when sale has no satoshiAmount", () => {
    render(<SalesCard sale={baseSale} formatCurrency={formatCurrency} currentRate={95000} />);
    expect(formatCurrency).toHaveBeenCalledWith(3000);
    expect(screen.queryByText(/amount-display/)).not.toBeInTheDocument();
  });
});
