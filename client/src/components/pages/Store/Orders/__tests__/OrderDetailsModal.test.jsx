import { render, screen, fireEvent } from "@testing-library/react";

import { OrderDetailsModal } from "../OrderDetailsModal";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Modal = ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null);
  const ModalContent = ({ children }) => <div>{children}</div>;
  const ModalHeader = ({ children }) => <div>{children}</div>;
  const ModalBody = ({ children }) => <div>{children}</div>;
  const ModalFooter = ({ children }) => <div>{children}</div>;
  const Button = ({ onPress, children }) => (
    <button type="button" onClick={onPress}>
      {children}
    </button>
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
      user_name: "Luis",
      status: "paid",
      payment_method: "Cash",
      total: 25,
      created_at: "2024-01-01T10:00:00Z",
      table_id: "T1",
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
    expect(screen.getByText("order-1")).toBeInTheDocument();
    expect(screen.getByText("Luis")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
    expect(formatAmount).toHaveBeenCalledWith(2500);

    fireEvent.click(screen.getByText("details.close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders fallbacks when order is missing", () => {
    render(
      <OrderDetailsModal
        order={null}
        isOpen
        onClose={jest.fn()}
        onEdit={jest.fn()}
        formatAmount={jest.fn()}
      />,
    );

    expect(screen.getAllByText("details.unassigned").length).toBeGreaterThan(0);
  });
});
