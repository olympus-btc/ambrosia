import { render, screen } from "@testing-library/react";

import { OrderDetailModal } from "../OrderDetailModal";

jest.mock("@heroui/react", () => ({
  Modal: ({ children, isOpen }) => (isOpen ? <div data-testid="modal">{children}</div> : null),
  ModalContent: ({ children }) => <div>{children}</div>,
  ModalHeader: ({ children }) => <div data-testid="modal-header">{children}</div>,
  ModalBody: ({ children }) => <div data-testid="modal-body">{children}</div>,
  Table: ({ children }) => <table>{children}</table>,
  TableHeader: ({ children }) => <thead><tr>{children}</tr></thead>,
  TableColumn: ({ children }) => <th>{children}</th>,
  TableBody: ({ children }) => <tbody>{children}</tbody>,
  TableRow: ({ children }) => <tr>{children}</tr>,
  TableCell: ({ children, className }) => <td className={className}>{children}</td>,
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@lib/formatDate", () => jest.fn((date) => `formatted:${date}`));

const ORDER_FIXTURE = {
  shortId: "ABC123",
  date: "2024-01-15",
  userName: "alice",
  paymentMethod: "Cash",
  total: 5000,
  items: [
    { productName: "Widget A", quantity: 2, priceAtOrder: 1500 },
    { productName: "Widget B", quantity: 1, priceAtOrder: 2000 },
  ],
};

const formatCurrency = (cents) => `$${cents}`;

describe("OrderDetailModal", () => {
  it("does not render when order is null", () => {
    render(<OrderDetailModal order={null} formatCurrency={formatCurrency} onClose={jest.fn()} />);
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  it("renders modal when order is provided", () => {
    render(<OrderDetailModal order={ORDER_FIXTURE} formatCurrency={formatCurrency} onClose={jest.fn()} />);
    expect(screen.getByTestId("modal")).toBeInTheDocument();
  });

  it("shows the order shortId in the header", () => {
    render(<OrderDetailModal order={ORDER_FIXTURE} formatCurrency={formatCurrency} onClose={jest.fn()} />);
    expect(screen.getByText("#ABC123")).toBeInTheDocument();
  });

  it("shows i18n detail title in the header", () => {
    render(<OrderDetailModal order={ORDER_FIXTURE} formatCurrency={formatCurrency} onClose={jest.fn()} />);
    expect(screen.getByText("orders.detailTitle")).toBeInTheDocument();
  });

  it("shows formatted date", () => {
    render(<OrderDetailModal order={ORDER_FIXTURE} formatCurrency={formatCurrency} onClose={jest.fn()} />);
    expect(screen.getByText("formatted:2024-01-15")).toBeInTheDocument();
  });

  it("shows user name", () => {
    render(<OrderDetailModal order={ORDER_FIXTURE} formatCurrency={formatCurrency} onClose={jest.fn()} />);
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("shows payment method", () => {
    render(<OrderDetailModal order={ORDER_FIXTURE} formatCurrency={formatCurrency} onClose={jest.fn()} />);
    expect(screen.getByText("Cash")).toBeInTheDocument();
  });

  it("shows each item's product name", () => {
    render(<OrderDetailModal order={ORDER_FIXTURE} formatCurrency={formatCurrency} onClose={jest.fn()} />);
    expect(screen.getByText("Widget A")).toBeInTheDocument();
    expect(screen.getByText("Widget B")).toBeInTheDocument();
  });

  it("shows each item's quantity", () => {
    render(<OrderDetailModal order={ORDER_FIXTURE} formatCurrency={formatCurrency} onClose={jest.fn()} />);
    expect(screen.getByText("×2")).toBeInTheDocument();
    expect(screen.getByText("×1")).toBeInTheDocument();
  });

  it("shows formatted total", () => {
    render(<OrderDetailModal order={ORDER_FIXTURE} formatCurrency={formatCurrency} onClose={jest.fn()} />);
    expect(screen.getByText("$5000")).toBeInTheDocument();
  });

  it("shows fallback dash when userName is null", () => {
    const order = { ...ORDER_FIXTURE, userName: null };
    render(<OrderDetailModal order={order} formatCurrency={formatCurrency} onClose={jest.fn()} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows i18n unknown label when paymentMethod is empty", () => {
    const order = { ...ORDER_FIXTURE, paymentMethod: "" };
    render(<OrderDetailModal order={order} formatCurrency={formatCurrency} onClose={jest.fn()} />);
    expect(screen.getByText("payment.unknown")).toBeInTheDocument();
  });
});
