import { render, screen, fireEvent } from "@testing-library/react";

import { OrderDetailsModal } from "../OrderDetailsModal";

jest.mock("@/components/shared/AmountDisplay", () => ({
  AmountDisplay: ({ satoshis }) => <span>{`amount-display-${satoshis}`}</span>,
}));

jest.mock("../OrdersList/StatusChip", () => ({
  StatusChip: ({ status }) => <span>{`status-${status}`}</span>,
}));

jest.mock("@/lib/formatDate", () => ({
  __esModule: true,
  default: jest.fn(() => "formatted-date"),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Modal = ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null);
  const ModalContent = ({ children }) => <div>{children}</div>;
  const ModalHeader = ({ children }) => <div>{children}</div>;
  const ModalBody = ({ children }) => <div>{children}</div>;
  const ModalFooter = ({ children }) => <div>{children}</div>;
  const Button = ({ onPress, children }) => (
    <button type="button" onClick={onPress}>{children}</button>
  );
  const Chip = ({ children }) => <span>{children}</span>;

  return {
    ...actual,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Chip,
  };
});

describe("OrderDetailsModal", () => {
  it("renders order details and handles close", () => {
    const onClose = jest.fn();
    const formatAmount = jest.fn((value) => `fmt-${value}`);
    const order = {
      id: "order-1",
      userName: "Luis",
      status: "paid",
      paymentMethod: "Cash",
      total: 25,
      createdAt: "2024-01-01T10:00:00Z",
      tableId: "T1",
    };

    render(
      <OrderDetailsModal
        order={order}
        isOpen
        onClose={onClose}
        onEdit={jest.fn()}
        formatAmount={formatAmount}
      />,
    );

    expect(screen.getByText("details.title")).toBeInTheDocument();
    expect(screen.getByText("#order-1")).toBeInTheDocument();
    expect(screen.getByText("Luis")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByText("formatted-date")).toBeInTheDocument();
    expect(formatAmount).toHaveBeenCalledWith(2500);

    fireEvent.click(screen.getByText("details.close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders AmountDisplay for BTC orders with satoshiAmount", () => {
    const formatAmount = jest.fn((value) => `fmt-${value}`);
    const btcOrder = {
      id: "order-btc",
      userName: "Ana",
      status: "paid",
      paymentMethod: "BTC",
      total: 1.0,
      createdAt: "2024-01-01T10:00:00Z",
      satoshiAmount: 100000,
      exchangeRateAtPayment: 95000,
      exchangeRateCurrency: "usd",
      fiatAmountAtPayment: 1.0,
    };

    render(
      <OrderDetailsModal
        order={btcOrder}
        isOpen
        onClose={jest.fn()}
        onEdit={jest.fn()}
        formatAmount={formatAmount}
        currentRate={95000}
      />,
    );

    expect(screen.getByText("amount-display-100000")).toBeInTheDocument();
    expect(formatAmount).not.toHaveBeenCalledWith(100);
  });

  it("uses formatAmount for non-BTC orders", () => {
    const formatAmount = jest.fn((value) => `fmt-${value}`);
    const cashOrder = {
      id: "order-cash",
      userName: "Luis",
      status: "paid",
      paymentMethod: "Cash",
      total: 25,
      createdAt: "2024-01-01T10:00:00Z",
    };

    render(
      <OrderDetailsModal
        order={cashOrder}
        isOpen
        onClose={jest.fn()}
        onEdit={jest.fn()}
        formatAmount={formatAmount}
        currentRate={95000}
      />,
    );

    expect(formatAmount).toHaveBeenCalledWith(2500);
    expect(screen.queryByText(/amount-display/)).not.toBeInTheDocument();
  });

  it("renders only the title when order is null", () => {
    render(
      <OrderDetailsModal
        order={null}
        isOpen
        onClose={jest.fn()}
        onEdit={jest.fn()}
        formatAmount={jest.fn()}
      />,
    );

    expect(screen.getByText("details.title")).toBeInTheDocument();
    expect(screen.queryByText("details.user")).not.toBeInTheDocument();
  });
});
