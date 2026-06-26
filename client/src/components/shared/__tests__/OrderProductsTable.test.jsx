import { render, screen } from "@testing-library/react";

import { OrderProductsTable } from "../OrderProductsTable";

jest.mock("@heroui/react", () => ({
  Table: ({ children }) => <table>{children}</table>,
  TableHeader: ({ children }) => <thead><tr>{children}</tr></thead>,
  TableColumn: ({ children }) => <th>{children}</th>,
  TableBody: ({ children }) => <tbody>{children}</tbody>,
  TableRow: ({ children }) => <tr>{children}</tr>,
  TableCell: ({ children }) => <td>{children}</td>,
}));

const LABELS = {
  products: "Products",
  quantity: "Qty",
  unitPrice: "Unit Price",
  subtotal: "Subtotal",
};

const formatAmount = (cents) => `$${cents}`;

describe("OrderProductsTable", () => {
  it("renders column headers from labels", () => {
    render(<OrderProductsTable items={[]} formatAmount={formatAmount} labels={LABELS} />);

    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Qty")).toBeInTheDocument();
    expect(screen.getByText("Unit Price")).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
  });

  it("renders a row for each item", () => {
    const items = [
      { productName: "Tacos", quantity: 2, priceAtOrder: 500 },
      { productName: "Soda", quantity: 1, priceAtOrder: 200 },
    ];

    render(<OrderProductsTable items={items} formatAmount={formatAmount} labels={LABELS} />);

    expect(screen.getByText("Tacos")).toBeInTheDocument();
    expect(screen.getByText("Soda")).toBeInTheDocument();
  });

  it("renders quantity with × prefix", () => {
    const items = [{ productName: "Burger", quantity: 3, priceAtOrder: 1000 }];

    render(<OrderProductsTable items={items} formatAmount={formatAmount} labels={LABELS} />);

    expect(screen.getByText("×3")).toBeInTheDocument();
  });

  it("renders unit price using formatAmount", () => {
    const items = [{ productName: "Fries", quantity: 2, priceAtOrder: 750 }];

    render(<OrderProductsTable items={items} formatAmount={formatAmount} labels={LABELS} />);

    expect(screen.getByText("$750")).toBeInTheDocument();
  });

  it("renders subtotal as quantity × priceAtOrder", () => {
    const items = [{ productName: "Pizza", quantity: 2, priceAtOrder: 1200 }];

    render(<OrderProductsTable items={items} formatAmount={formatAmount} labels={LABELS} />);

    expect(screen.getByText("$2400")).toBeInTheDocument();
  });

  it("renders nothing in the table body when items is empty", () => {
    render(<OrderProductsTable items={[]} formatAmount={formatAmount} labels={LABELS} />);

    expect(screen.queryByRole("row", { name: /tacos/i })).not.toBeInTheDocument();
  });
});
