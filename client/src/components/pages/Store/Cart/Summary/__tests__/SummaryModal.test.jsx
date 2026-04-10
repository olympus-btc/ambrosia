import { render, screen, fireEvent } from "@testing-library/react";

import { SummaryModal } from "../SummaryModal";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@heroui/react", () => ({
  Modal: ({ isOpen, onClose, children }) => (isOpen
    ? <div data-testid="modal"><button aria-label="close" onClick={onClose} />{children}</div>
    : null),
  ModalContent: ({ children }) => <div>{typeof children === "function" ? children() : children}</div>,
  ModalHeader: ({ children }) => <div data-testid="modal-header">{children}</div>,
  ModalBody: ({ children }) => <div data-testid="modal-body">{children}</div>,
}));

jest.mock("../SummaryContent", () => ({
  SummaryContent: ({ cartItems }) => (
    <div data-testid="summary-content" data-items={cartItems?.length ?? 0} />
  ),
}));

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  cartItems: [{ id: 1 }],
  discount: 0,
  onRemoveProduct: jest.fn(),
  onUpdateQuantity: jest.fn(),
  onPay: jest.fn(),
  isPaying: false,
  paymentError: "",
  onClearPaymentError: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SummaryModal", () => {
  it("renders nothing when isOpen is false", () => {
    render(<SummaryModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  it("renders modal with title when isOpen is true", () => {
    render(<SummaryModal {...defaultProps} />);

    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByTestId("modal-header")).toHaveTextContent("summary.title");
  });

  it("renders SummaryContent inside ModalBody", () => {
    render(<SummaryModal {...defaultProps} />);

    expect(screen.getByTestId("summary-content")).toBeInTheDocument();
    expect(screen.getByTestId("modal-body")).toContainElement(screen.getByTestId("summary-content"));
  });

  it("forwards props to SummaryContent", () => {
    render(<SummaryModal {...defaultProps} />);

    expect(screen.getByTestId("summary-content")).toHaveAttribute("data-items", "1");
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();
    render(<SummaryModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("close"));
    expect(onClose).toHaveBeenCalled();
  });
});
