import { render, screen } from "@testing-library/react";

import { OrdersList } from "../OrdersList";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({ formatAmount: (value) => `fmt-${value}` }),
}));

jest.mock("../OrdersCard", () => ({
  OrdersCard: ({ order }) => <div>{`card-${order.id}`}</div>,
}));

jest.mock("../OrdersTable", () => ({
  OrdersTable: ({ orders }) => (
    <div>
      {orders.map((o) => <div key={o.id}>{`row-${o.id}`}</div>)}
    </div>
  ),
}));

const orders = [
  { id: "order-1", status: "paid", waiter: "Ana", total: 10, created_at: "2024-01-01" },
  { id: "order-2", status: "open", waiter: "Luis", total: 20, created_at: "2024-01-02" },
];

describe("OrdersList", () => {
  it("renders cards for mobile and table for desktop", () => {
    render(<OrdersList orders={orders} onViewOrder={jest.fn()} />);

    expect(screen.getByText("card-order-1")).toBeInTheDocument();
    expect(screen.getByText("card-order-2")).toBeInTheDocument();
    expect(screen.getByText("row-order-1")).toBeInTheDocument();
    expect(screen.getByText("row-order-2")).toBeInTheDocument();
  });
});
