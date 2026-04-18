import { render, screen, fireEvent } from "@testing-library/react";

import { OrdersCard } from "../OrdersCard";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Card = ({ children }) => <div>{children}</div>;
  const CardBody = ({ children }) => <div>{children}</div>;
  const Chip = ({ children }) => <span>{children}</span>;
  return { ...actual, Card, CardBody, Chip };
});

jest.mock("@/components/shared/ViewButton", () => ({
  ViewButton: ({ onPress, children }) => (
    <button type="button" onClick={onPress}>{children}</button>
  ),
}));

jest.mock("../StatusChip", () => ({
  StatusChip: ({ status }) => <span>{`status-${status}`}</span>,
}));

describe("OrdersCard", () => {
  const formatAmount = jest.fn((value) => `fmt-${value}`);
  const onViewOrder = jest.fn();

  const order = {
    id: "abc-123",
    user_name: "Ana",
    status: "paid",
    payment_method: "Cash",
    total: 15,
    created_at: "2024-01-01T10:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders user name, status, payment method, date and total", () => {
    render(<OrdersCard order={order} formatAmount={formatAmount} onViewOrder={onViewOrder} />);

    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("status-paid")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
    expect(formatAmount).toHaveBeenCalledWith(1500);
  });

  it("shows unassigned when no user_name", () => {
    render(<OrdersCard order={{ ...order, user_name: null }} formatAmount={formatAmount} onViewOrder={onViewOrder} />);
    expect(screen.getByText("details.unassigned")).toBeInTheDocument();
  });

  it("shows noPayment when no payment method", () => {
    render(<OrdersCard order={{ ...order, payment_method: null }} formatAmount={formatAmount} onViewOrder={onViewOrder} />);
    expect(screen.getByText("details.noPayment")).toBeInTheDocument();
  });

  it("calls onViewOrder when view button is pressed", () => {
    render(<OrdersCard order={order} formatAmount={formatAmount} onViewOrder={onViewOrder} />);
    fireEvent.click(screen.getByText("table.view"));
    expect(onViewOrder).toHaveBeenCalledWith(order);
  });
});
