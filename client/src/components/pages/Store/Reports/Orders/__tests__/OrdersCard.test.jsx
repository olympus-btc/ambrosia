import { render, screen, fireEvent } from "@testing-library/react";

import { OrdersCard } from "../OrdersCard";

jest.mock("@heroui/react", () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
}));

jest.mock("@/components/shared/ViewButton", () => ({
  ViewButton: ({ onPress, children }) => <button data-testid="view-button" onClick={onPress}>{children}</button>,
}));

jest.mock("@lib/formatDate", () => jest.fn((date) => `fmt:${date}`));

jest.mock("lucide-react", () => ({
  ShoppingCart: () => null,
  Users: () => null,
}));

const ORDER = {
  shortId: "ABC123",
  date: "2024-01-15",
  userName: "alice",
  paymentMethod: "Cash",
  total: 5000,
  itemCount: 3,
  items: [
    { productName: "Widget A" },
    { productName: "Widget B" },
  ],
};

const formatCurrency = jest.fn((cents) => `$${cents}`);

describe("OrdersCard", () => {
  beforeEach(() => formatCurrency.mockClear());

  it("shows the order shortId", () => {
    render(<OrdersCard order={ORDER} formatCurrency={formatCurrency} onClick={jest.fn()} />);
    expect(screen.getByText("#ABC123")).toBeInTheDocument();
  });

  it("shows the user name", () => {
    render(<OrdersCard order={ORDER} formatCurrency={formatCurrency} onClick={jest.fn()} />);
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("shows dash when userName is null", () => {
    render(<OrdersCard order={{ ...ORDER, userName: null }} formatCurrency={formatCurrency} onClick={jest.fn()} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the payment method", () => {
    render(<OrdersCard order={ORDER} formatCurrency={formatCurrency} onClick={jest.fn()} />);
    expect(screen.getByText("Cash")).toBeInTheDocument();
  });

  it("calls formatCurrency with order.total", () => {
    render(<OrdersCard order={ORDER} formatCurrency={formatCurrency} onClick={jest.fn()} />);
    expect(formatCurrency).toHaveBeenCalledWith(5000);
  });

  it("shows formatted date", () => {
    render(<OrdersCard order={ORDER} formatCurrency={formatCurrency} onClick={jest.fn()} />);
    expect(screen.getByText("fmt:2024-01-15")).toBeInTheDocument();
  });

  it("shows dash when date is falsy", () => {
    render(<OrdersCard order={{ ...ORDER, date: null }} formatCurrency={formatCurrency} onClick={jest.fn()} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("calls onClick when ViewButton is pressed", () => {
    const onClick = jest.fn();
    render(<OrdersCard order={ORDER} formatCurrency={formatCurrency} onClick={onClick} />);
    fireEvent.click(screen.getByTestId("view-button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
