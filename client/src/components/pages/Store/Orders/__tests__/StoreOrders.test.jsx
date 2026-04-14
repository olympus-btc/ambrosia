import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import StoreOrders from "../StoreOrders";

let mockOrders = [];
const mockPush = jest.fn();
const mockFetchOrders = jest.fn();
const mockFetchOrdersFiltered = jest.fn();

jest.mock("../../hooks/useOrders", () => ({
  useOrders: () => ({
    orders: mockOrders,
    fetchOrders: mockFetchOrders,
    fetchOrdersFiltered: mockFetchOrdersFiltered,
  }),
}));

jest.mock("@/components/pages/Store/Cart/hooks/usePaymentMethod", () => ({
  usePaymentMethods: () => ({
    paymentMethods: [{ id: "cash", name: "Cash" }],
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
  OrdersFilterBar: ({ onSearchChange, onRowsPerPageChange, onFiltersChange, onApplyFilters, onClearFilters }) => (
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
      <button type="button" onClick={() => onFiltersChange({ status: "paid" })}>
        set-status
      </button>
      <button type="button" onClick={onApplyFilters}>
        apply-filters
      </button>
      <button type="button" onClick={onClearFilters}>
        clear-filters
      </button>
    </div>
  ),
}));

jest.mock("../OrdersList/OrdersList", () => ({
  OrdersList: ({ orders, onViewOrder }) => (
    <div>
      {orders.map((order) => (
        <button key={order.id} type="button" onClick={() => onViewOrder(order)}>
          {order.id}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("../OrdersList/EmptyOrdersState", () => ({
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
    mockFetchOrders.mockReset();
    mockFetchOrdersFiltered.mockReset();
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

  it("applies server filters and clears them through the hook", async () => {
    mockFetchOrdersFiltered.mockResolvedValue([]);
    mockFetchOrders.mockResolvedValue([]);

    render(<StoreOrders />);

    fireEvent.click(screen.getByText("set-status"));
    fireEvent.click(screen.getByText("apply-filters"));

    await waitFor(() => expect(mockFetchOrdersFiltered).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paid" }),
    ));

    fireEvent.click(screen.getByText("clear-filters"));

    await waitFor(() => expect(mockFetchOrders).toHaveBeenCalledTimes(1));
  });
});
