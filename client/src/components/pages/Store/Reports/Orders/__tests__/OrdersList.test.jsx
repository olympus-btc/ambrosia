import { render, screen, fireEvent } from "@testing-library/react";

import { ReportsOrdersList } from "../OrdersList";

jest.mock("../OrdersCard", () => ({
  OrdersCard: ({ order, onClick }) => (
    <div data-testid="orders-card" onClick={onClick}>{order.orderId}</div>
  ),
}));

jest.mock("../OrderDetailModal", () => ({
  OrderDetailModal: ({ order, onClose }) => (
    <div
      data-testid="order-detail-modal"
      data-open={String(Boolean(order))}
      onClick={onClose}
    />
  ),
}));

jest.mock("@/components/shared/DataTable", () => ({
  DataTable: ({ columns, items, getKey }) => (
    <table>
      <tbody>
        {items.map((item) => (
          <tr key={getKey(item)}>
            {columns.map((col) => (
              <td key={col.key}>{col.render(item)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

jest.mock("@/components/shared/ViewButton", () => ({
  ViewButton: ({ onPress, children }) => (
    <button data-testid="view-button" onClick={onPress}>{children}</button>
  ),
}));

jest.mock("@lib/formatDate", () => ({
  parseUtcDate: (dateString) => new Date(dateString),
  formatDateParts: (dateString) => {
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) return { localDay: "", date: "-", time: "" };
    return {
      localDay: parsed.toISOString().slice(0, 10),
      date: parsed.toLocaleDateString(),
      time: parsed.toLocaleTimeString(),
    };
  },
}));

jest.mock("lucide-react", () => ({
  ShoppingCart: () => null,
}));

const ORDER_FIXTURE = [
  {
    orderId: "order-aaa-111",
    shortId: "AAA111",
    date: "2024-01-15T10:00:00",
    userName: "alice",
    paymentMethod: "Cash",
    total: 5000,
    itemCount: 2,
    items: [
      { productName: "Widget A", quantity: 1 },
      { productName: "Widget B", quantity: 1 },
    ],
  },
  {
    orderId: "order-bbb-222",
    shortId: "BBB222",
    date: "2024-01-16T11:00:00",
    userName: null,
    paymentMethod: "",
    total: 3000,
    itemCount: 1,
    items: [{ productName: "Widget C", quantity: 1 }],
  },
];

const formatCurrency = (cents) => `$${cents}`;

describe("ReportsOrdersList", () => {
  it("shows empty state when orders is empty", () => {
    render(<ReportsOrdersList orders={[]} formatCurrency={formatCurrency} />);
    expect(screen.getByText("orders.empty")).toBeInTheDocument();
  });

  it("shows empty state when orders is undefined", () => {
    render(<ReportsOrdersList orders={undefined} formatCurrency={formatCurrency} />);
    expect(screen.getByText("orders.empty")).toBeInTheDocument();
  });

  it("renders an OrdersCard per order in mobile view", () => {
    render(<ReportsOrdersList orders={ORDER_FIXTURE} formatCurrency={formatCurrency} />);
    expect(screen.getAllByTestId("orders-card")).toHaveLength(2);
  });

  it("renders the DataTable with orders in desktop view", () => {
    render(<ReportsOrdersList orders={ORDER_FIXTURE} formatCurrency={formatCurrency} />);
    expect(screen.getAllByTestId("view-button")).toHaveLength(ORDER_FIXTURE.length);
  });

  it("modal starts closed (data-open=false)", () => {
    render(<ReportsOrdersList orders={ORDER_FIXTURE} formatCurrency={formatCurrency} />);
    expect(screen.getByTestId("order-detail-modal")).toHaveAttribute("data-open", "false");
  });

  it("opens the modal when ViewButton is pressed", () => {
    render(<ReportsOrdersList orders={ORDER_FIXTURE} formatCurrency={formatCurrency} />);
    fireEvent.click(screen.getAllByTestId("view-button")[0]);
    expect(screen.getByTestId("order-detail-modal")).toHaveAttribute("data-open", "true");
  });

  it("closes the modal via onClose callback", () => {
    render(<ReportsOrdersList orders={ORDER_FIXTURE} formatCurrency={formatCurrency} />);
    fireEvent.click(screen.getAllByTestId("view-button")[0]);
    fireEvent.click(screen.getByTestId("order-detail-modal"));
    expect(screen.getByTestId("order-detail-modal")).toHaveAttribute("data-open", "false");
  });

  it("shows dash in user column when userName is null", () => {
    render(<ReportsOrdersList orders={ORDER_FIXTURE} formatCurrency={formatCurrency} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows i18n unknown label when paymentMethod is empty", () => {
    render(<ReportsOrdersList orders={ORDER_FIXTURE} formatCurrency={formatCurrency} />);
    expect(screen.getByText("payment.unknown")).toBeInTheDocument();
  });

  it("shows overflow label when order has more than 2 items", () => {
    const orderWith3Items = [{
      ...ORDER_FIXTURE[0],
      items: [
        { productName: "A", quantity: 1 },
        { productName: "B", quantity: 1 },
        { productName: "C", quantity: 1 },
      ],
    }];
    render(<ReportsOrdersList orders={orderWith3Items} formatCurrency={formatCurrency} />);
    expect(screen.getAllByText(/\+1 orders\.more/).length).toBeGreaterThan(0);
  });
});
