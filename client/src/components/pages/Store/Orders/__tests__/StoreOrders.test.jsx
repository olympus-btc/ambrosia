import { render, screen, fireEvent } from "@testing-library/react";

import StoreOrders from "../StoreOrders";

let mockOrders = [];
const mockPush = jest.fn();

jest.mock("../../hooks/useOrders", () => ({
  useOrders: () => ({
    orders: mockOrders,
  }),
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatAmount: (value) => `fmt-${value}`,
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("../OrdersFilterBar", () => ({
  OrdersFilterBar: ({ onSearchChange, onRowsPerPageChange }) => (
    <div>
      <button type="button" onClick={() => onSearchChange("order-1")}>
        search-match
      </button>
      <button type="button" onClick={() => onSearchChange("missing")}>
        search-empty
      </button>
      <button type="button" onClick={() => onRowsPerPageChange("1")}>
        rows-1
      </button>
    </div>
  ),
}));

jest.mock("../OrdersTable", () => ({
  OrdersTable: ({ orders, onViewOrder }) => (
    <div>
      {orders.map((order) => (
        <button key={order.id} type="button" onClick={() => onViewOrder(order)}>
          {order.id}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("../EmptyOrdersState", () => ({
  EmptyOrdersState: ({ filter, searchTerm }) => (
    <div>{`empty-${filter}-${searchTerm}`}</div>
  ),
}));

jest.mock("../OrderDetailsModal", () => ({
  OrderDetailsModal: ({ order, isOpen, onClose, onEdit }) => (isOpen ? (
    <div>
      <span>{`selected-${order?.id}`}</span>
      <button type="button" onClick={onEdit}>
        edit
      </button>
      <button type="button" onClick={onClose}>
        close
      </button>
    </div>
  ) : null),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Card = ({ children }) => <div>{children}</div>;
  const CardBody = ({ children }) => <div>{children}</div>;
  const CardHeader = ({ children }) => <div>{children}</div>;
  const Pagination = ({ page, total, onChange }) => (
    <div>
      <span>{`page-${page}-of-${total}`}</span>
      <button type="button" onClick={() => onChange(page + 1)}>
        next
      </button>
    </div>
  );

  return { ...actual, Card, CardBody, CardHeader, Pagination };
});

describe("StoreOrders", () => {
  beforeEach(() => {
    mockOrders = [
      { id: "order-1", status: "paid", waiter: "Ana", total: 10, created_at: "2024-01-01" },
      { id: "order-2", status: "paid", waiter: "Luis", total: 20, created_at: "2024-01-02" },
    ];
    mockPush.mockClear();
  });

  it("filters by search term and shows empty state", () => {
    render(<StoreOrders />);

    expect(screen.getByText("order-1")).toBeInTheDocument();
    expect(screen.getByText("order-2")).toBeInTheDocument();

    fireEvent.click(screen.getByText("search-match"));
    expect(screen.getByText("order-1")).toBeInTheDocument();
    expect(screen.queryByText("order-2")).toBeNull();

    fireEvent.click(screen.getByText("search-empty"));
    expect(screen.getByText("empty-paid-missing")).toBeInTheDocument();
  });

  it("paginates and opens order details", () => {
    render(<StoreOrders />);

    fireEvent.click(screen.getByText("rows-1"));
    expect(screen.getByText("page-1-of-2")).toBeInTheDocument();

    fireEvent.click(screen.getByText("next"));
    expect(screen.getByText("order-2")).toBeInTheDocument();

    fireEvent.click(screen.getByText("order-2"));
    expect(screen.getByText("selected-order-2")).toBeInTheDocument();

    fireEvent.click(screen.getByText("close"));
    expect(screen.queryByText("selected-order-2")).toBeNull();

    fireEvent.click(screen.getByText("order-2"));
    expect(screen.getByText("selected-order-2")).toBeInTheDocument();

    fireEvent.click(screen.getByText("edit"));
    expect(mockPush).toHaveBeenCalledWith("/modify-order/order-2");
    expect(screen.queryByText("selected-order-2")).toBeNull();
  });
});
