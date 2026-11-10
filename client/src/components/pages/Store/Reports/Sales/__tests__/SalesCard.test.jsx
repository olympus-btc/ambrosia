import { render, screen } from "@testing-library/react";

import { SalesCard } from "../SalesCard";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Card = ({ children, className }) => <div className={className}>{children}</div>;
  const CardBody = ({ children, className }) => <div className={className}>{children}</div>;
  const Popover = ({ children }) => <>{children}</>;
  const PopoverTrigger = ({ children }) => <>{children}</>;
  const PopoverContent = ({ children }) => <div data-testid="popover-content">{children}</div>;
  return { ...actual, Card, CardBody, Popover, PopoverTrigger, PopoverContent };
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
    expect(screen.getByText("cash")).toBeInTheDocument();
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

  it("renders the lightning fee info popover when lightningFeeSat is present", () => {
    render(<SalesCard sale={{ ...baseSale, lightningFeeSat: 50 }} formatCurrency={formatCurrency} />);
    expect(screen.getByLabelText("sales.lightningFee")).toBeInTheDocument();
    expect(screen.getByText("amount-display-50")).toBeInTheDocument();
    expect(screen.getByTestId("popover-content")).toHaveTextContent("sales.lightningFeeInfo");
  });

  it("does not render the lightning fee info popover when lightningFeeSat is absent", () => {
    render(<SalesCard sale={baseSale} formatCurrency={formatCurrency} />);
    expect(screen.queryByText(/sales\.lightningFee/)).not.toBeInTheDocument();
  });

  it("shows the refunded status chip when the sale is refunded", () => {
    render(<SalesCard sale={{ ...baseSale, refunded: true }} formatCurrency={formatCurrency} />);
    expect(screen.getByText("refunded")).toBeInTheDocument();
  });

  it("shows the paid status chip when the sale is not refunded", () => {
    render(<SalesCard sale={baseSale} formatCurrency={formatCurrency} />);
    expect(screen.queryByText("refunded")).not.toBeInTheDocument();
    expect(screen.getByText("paid")).toBeInTheDocument();
  });
});
