import { render, screen } from "@testing-library/react";

import { SalesList } from "../Sales/SalesList";

jest.mock("../Sales/PaymentBadge", () => ({
  PaymentBadge: ({ method }) => <span data-testid="payment-badge">{method}</span>,
}));

jest.mock("../Sales/SalesCard", () => ({
  SalesCard: ({ sale }) => <div data-testid="sales-card">{`card-${sale.productName}`}</div>,
}));

jest.mock("@/components/shared/DataTable", () => ({
  DataTable: ({ columns, items }) => (
    <table>
      <tbody>
        {items.map((item, i) => (
          <tr key={i}>
            {columns.map((col) => (
              <td key={col.key}>{col.render(item)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

jest.mock("@heroui/react", () => {
  const Card = ({ children, ...props }) => <div {...props}>{children}</div>;
  const CardBody = ({ children, className }) => <div className={className}>{children}</div>;
  return { Card, CardBody };
});

const mockFormatCurrency = jest.fn((cents) => `$${cents / 100}`);

describe("SalesList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when sales is an empty array", () => {
    render(<SalesList sales={[]} formatCurrency={mockFormatCurrency} />);
    expect(screen.getByText("sales.empty")).toBeInTheDocument();
  });

  it("renders empty state when sales is undefined", () => {
    render(<SalesList sales={undefined} formatCurrency={mockFormatCurrency} />);
    expect(screen.getByText("sales.empty")).toBeInTheDocument();
  });

  it("does not render items when the list is empty", () => {
    render(<SalesList sales={[]} formatCurrency={mockFormatCurrency} />);
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

    render(<SalesList sales={sales} formatCurrency={mockFormatCurrency} />);

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

    render(<SalesList sales={sales} formatCurrency={mockFormatCurrency} />);

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

    render(<SalesList sales={sales} formatCurrency={mockFormatCurrency} />);

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

    render(<SalesList sales={sales} formatCurrency={mockFormatCurrency} />);
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

    render(<SalesList sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByTestId("payment-badge")).toHaveTextContent("BTC");
  });

  it("renders multiple sale items", () => {
    const sales = [
      { productName: "Prod A", quantity: 1, priceAtOrder: 100, userName: "u1", paymentMethod: "Cash", saleDate: "2024-01-01 00:00:00" },
      { productName: "Prod B", quantity: 2, priceAtOrder: 200, userName: "u2", paymentMethod: "BTC", saleDate: "2024-01-02 00:00:00" },
    ];

    render(<SalesList sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByText("Prod A")).toBeInTheDocument();
    expect(screen.getByText("Prod B")).toBeInTheDocument();
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

    render(<SalesList sales={sales} formatCurrency={mockFormatCurrency} />);

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

    render(<SalesList sales={sales} formatCurrency={mockFormatCurrency} />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
