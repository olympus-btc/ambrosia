import { render, screen } from "@testing-library/react";

import { SalesTable } from "../components/SalesTable";

jest.mock("../components/PaymentBadge", () => ({
  PaymentBadge: ({ method }) => <span data-testid="payment-badge">{method}</span>,
}));

jest.mock("@heroui/react", () => {
  const Card = ({ children, ...props }) => <div {...props}>{children}</div>;
  const CardBody = ({ children, className }) => <div className={className}>{children}</div>;
  return { Card, CardBody };
});

const mockFormatCurrency = jest.fn((cents) => `$${cents / 100}`);

describe("SalesTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when sales is an empty array", () => {
    render(<SalesTable sales={[]} formatCurrency={mockFormatCurrency} />);
    expect(screen.getByText("sales.empty")).toBeInTheDocument();
  });

  it("renders empty state when sales is undefined", () => {
    render(<SalesTable sales={undefined} formatCurrency={mockFormatCurrency} />);
    expect(screen.getByText("sales.empty")).toBeInTheDocument();
  });

  it("does not render items when the list is empty", () => {
    render(<SalesTable sales={[]} formatCurrency={mockFormatCurrency} />);
    expect(screen.queryByTestId("payment-badge")).not.toBeInTheDocument();
  });

  it("renders the product name and user name", () => {
    const sales = [
      {
        productName: "Raspberry Pi",
        quantity: 2,
        priceAtOrder: 2500,
        userName: "alice",
        paymentMethod: "Cash",
        saleDate: "2024-06-15 10:30:00",
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByText("Raspberry Pi")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("renders the quantity with × prefix", () => {
    const sales = [
      {
        productName: "Widget",
        quantity: 5,
        priceAtOrder: 1000,
        userName: "bob",
        paymentMethod: "BTC",
        saleDate: "2024-01-01 00:00:00",
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByText("×5")).toBeInTheDocument();
  });

  it("calls formatCurrency with priceAtOrder for the unit price", () => {
    const sales = [
      {
        productName: "Widget",
        quantity: 3,
        priceAtOrder: 1500,
        userName: "carlos",
        paymentMethod: "Cash",
        saleDate: "2024-01-01 00:00:00",
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(mockFormatCurrency).toHaveBeenCalledWith(1500);
  });

  it("calls formatCurrency with priceAtOrder * quantity for the line total", () => {
    const sales = [
      {
        productName: "Widget",
        quantity: 3,
        priceAtOrder: 1500,
        userName: "carlos",
        paymentMethod: "Cash",
        saleDate: "2024-01-01 00:00:00",
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);
    expect(mockFormatCurrency).toHaveBeenCalledWith(4500);
  });

  it("shows the payment method badge", () => {
    const sales = [
      {
        productName: "Widget",
        quantity: 1,
        priceAtOrder: 500,
        userName: "diana",
        paymentMethod: "BTC",
        saleDate: "2024-01-01 00:00:00",
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByTestId("payment-badge")).toHaveTextContent("BTC");
  });

  it("renders multiple sale items", () => {
    const sales = [
      { productName: "Prod A", quantity: 1, priceAtOrder: 100, userName: "u1", paymentMethod: "Cash", saleDate: "2024-01-01 00:00:00" },
      { productName: "Prod B", quantity: 2, priceAtOrder: 200, userName: "u2", paymentMethod: "BTC", saleDate: "2024-01-02 00:00:00" },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByText("Prod A")).toBeInTheDocument();
    expect(screen.getByText("Prod B")).toBeInTheDocument();
  });

  it("renders the sale date using the native browser API", () => {
    const sales = [
      {
        productName: "Widget",
        quantity: 1,
        priceAtOrder: 500,
        userName: "test",
        paymentMethod: "Cash",
        saleDate: "2024-06-15T10:30:00",
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("shows dash when saleDate is null", () => {
    const sales = [
      {
        productName: "Widget",
        quantity: 1,
        priceAtOrder: 500,
        userName: "test",
        paymentMethod: "Cash",
        saleDate: null,
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("shows dash when saleDate is an empty string", () => {
    const sales = [
      {
        productName: "Widget",
        quantity: 1,
        priceAtOrder: 500,
        userName: "test",
        paymentMethod: "Cash",
        saleDate: "",
      },
    ];

    render(<SalesTable sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
