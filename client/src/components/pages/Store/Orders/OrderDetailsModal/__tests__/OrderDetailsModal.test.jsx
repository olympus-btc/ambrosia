import { render, screen, fireEvent, act } from "@testing-library/react";

import { OrderDetailsModal } from "../OrderDetailsModal";

jest.mock("@/components/shared/AmountDisplay", () => ({
  AmountDisplay: ({ satoshis }) => <span>{`amount-display-${satoshis}`}</span>,
}));

jest.mock("@/components/shared/StatusChip", () => ({
  StatusChip: ({ status }) => <span>{`status-${status}`}</span>,
}));

let capturedRefundModalProps;
jest.mock("../../RefundModal", () => ({
  RefundModal: (props) => {
    capturedRefundModalProps = props;
    return props.isOpen ? <div>refund-modal-open</div> : null;
  },
}));

jest.mock("@/lib/formatDate", () => ({
  __esModule: true,
  default: jest.fn(() => "formatted-date"),
}));

let mockCanRefund = true;
jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => mockCanRefund,
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
  beforeEach(() => {
    mockCanRefund = true;
  });

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

  it("shows the refund button only for paid orders", () => {
    const formatAmount = jest.fn((value) => `fmt-${value}`);
    const { rerender } = render(
      <OrderDetailsModal
        order={{ id: "order-1", status: "paid", total: 10 }}
        isOpen
        onClose={jest.fn()}
        formatAmount={formatAmount}
      />,
    );
    expect(screen.getByText("details.refund")).toBeInTheDocument();

    rerender(
      <OrderDetailsModal
        order={{ id: "order-1", status: "open", total: 10 }}
        isOpen
        onClose={jest.fn()}
        formatAmount={formatAmount}
      />,
    );
    expect(screen.queryByText("details.refund")).not.toBeInTheDocument();

    rerender(
      <OrderDetailsModal
        order={{ id: "order-1", status: "refunded", total: 10 }}
        isOpen
        onClose={jest.fn()}
        formatAmount={formatAmount}
      />,
    );
    expect(screen.queryByText("details.refund")).not.toBeInTheDocument();
  });

  it("hides the refund button for a paid order when the user lacks orders_refund", () => {
    mockCanRefund = false;
    const formatAmount = jest.fn((value) => `fmt-${value}`);

    render(
      <OrderDetailsModal
        order={{ id: "order-1", status: "paid", total: 10 }}
        isOpen
        onClose={jest.fn()}
        formatAmount={formatAmount}
      />,
    );

    expect(screen.queryByText("details.refund")).not.toBeInTheDocument();
  });

  it("opens the RefundModal when the refund button is pressed, and wires onRefunded", () => {
    const onRefunded = jest.fn();
    const order = { id: "order-1", status: "paid", total: 10 };

    render(
      <OrderDetailsModal
        order={order}
        isOpen
        onClose={jest.fn()}
        onRefunded={onRefunded}
        formatAmount={jest.fn((value) => `fmt-${value}`)}
      />,
    );

    expect(screen.queryByText("refund-modal-open")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("details.refund"));
    expect(screen.getByText("refund-modal-open")).toBeInTheDocument();

    act(() => capturedRefundModalProps.onRefunded());
    expect(onRefunded).toHaveBeenCalled();
  });

  it("renders refund info when the order has been refunded", () => {
    const order = {
      id: "order-1",
      status: "refunded",
      total: 10,
      refund: {
        refundedAt: "2024-01-05T10:00:00Z",
        satoshiAmount: 1500,
        refundInvoice: "lnbc1abcdefghijklmnopqrstuvwxyz",
      },
    };

    render(
      <OrderDetailsModal
        order={order}
        isOpen
        onClose={jest.fn()}
        formatAmount={jest.fn((value) => `fmt-${value}`)}
      />,
    );

    expect(screen.getByText(/details.refundedAt/)).toBeInTheDocument();
    expect(screen.getByText(/1500\s+details\.sats/)).toBeInTheDocument();
    expect(screen.getByTitle(order.refund.refundInvoice)).toBeInTheDocument();
  });
});
