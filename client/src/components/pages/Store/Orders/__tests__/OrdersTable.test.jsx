import { render, screen, fireEvent } from "@testing-library/react";

import { OrdersTable } from "../OrdersTable";

jest.mock("@/lib/formatDate", () => jest.fn(() => "formatted-date"));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Table = ({ children }) => <table>{children}</table>;
  const TableHeader = ({ children }) => (
    <thead>
      <tr>{children}</tr>
    </thead>
  );
  const TableColumn = ({ children }) => <th>{children}</th>;
  const TableBody = ({ children }) => <tbody>{children}</tbody>;
  const TableRow = ({ children }) => <tr>{children}</tr>;
  const TableCell = ({ children }) => <td>{children}</td>;
  const Button = ({ onPress, children }) => (
    <button type="button" onClick={onPress}>
      {children}
    </button>
  );
  const Chip = ({ children }) => <span>{children}</span>;

  return {
    ...actual,
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Button,
    Chip,
  };
});

describe("OrdersTable", () => {
  it("renders orders and triggers view callback", () => {
    const onViewOrder = jest.fn();
    const formatAmount = jest.fn((value) => `fmt-${value}`);

    const orders = [
      {
        id: "abcd1234efgh",
        waiter: "Ana",
        status: "paid",
        payment_method: "BTC",
        total: 15,
        created_at: "2024-01-01T10:00:00Z",
      },
      {
        id: "ijkl5678mnop",
        waiter: null,
        status: "open",
        payment_method: null,
        total: 20,
        created_at: "2024-02-01T10:00:00Z",
      },
    ];

    render(
      <OrdersTable
        orders={orders}
        formatAmount={formatAmount}
        onViewOrder={onViewOrder}
      />,
    );

    expect(screen.getByText("abcd1234efgh")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("details.noPayment")).toBeInTheDocument();
    expect(screen.getAllByText("formatted-date")).toHaveLength(2);
    expect(formatAmount).toHaveBeenCalledWith(1500);
    expect(formatAmount).toHaveBeenCalledWith(2000);

    fireEvent.click(screen.getAllByText("table.view")[0]);
    expect(onViewOrder).toHaveBeenCalledWith(orders[0]);
  });
});
