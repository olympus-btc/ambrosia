import { render, screen, fireEvent } from "@testing-library/react";

import { Summary } from "../Summary";

jest.mock("@heroui/react", () => ({
  Card: ({ children, shadow, className }) => <div data-shadow={shadow} className={className}>{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardBody: ({ children }) => <div data-testid="card-body">{children}</div>,
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress, children }) => (
    <button aria-label="clear-cart" onClick={onPress}>
      {children}
    </button>
  ),
}));

jest.mock("../SummaryContent", () => ({
  SummaryContent: ({ cartItems }) => (
    <div data-testid="summary-content" data-items={cartItems?.length ?? 0} />
  ),
}));

const defaultProps = {
  cartItems: [{ id: 1 }],
  discount: 0,
  onRemoveProduct: jest.fn(),
  onUpdateQuantity: jest.fn(),
  onPay: jest.fn(),
  isPaying: false,
  paymentError: "",
  onClearPaymentError: jest.fn(),
  onClearCart: jest.fn(),
};

describe("Summary", () => {
  it("renders the title", () => {
    render(<Summary {...defaultProps} />);

    expect(screen.getByText("summary.title")).toBeInTheDocument();
  });

  it("renders SummaryContent inside CardBody", () => {
    render(<Summary {...defaultProps} />);

    expect(screen.getByTestId("summary-content")).toBeInTheDocument();
    expect(screen.getByTestId("card-body")).toContainElement(screen.getByTestId("summary-content"));
  });

  it("forwards props to SummaryContent", () => {
    render(<Summary {...defaultProps} />);

    expect(screen.getByTestId("summary-content")).toHaveAttribute("data-items", "1");
  });

  it("renders clear cart button when cart has items", () => {
    render(<Summary {...defaultProps} />);

    expect(screen.getByLabelText("clear-cart")).toHaveTextContent("summary.clearCart");
  });

  it("does not render clear cart button when cart is empty", () => {
    render(<Summary {...defaultProps} cartItems={[]} />);

    expect(screen.queryByLabelText("clear-cart")).not.toBeInTheDocument();
  });

  it("calls onClearCart when clear button is pressed", () => {
    const onClearCart = jest.fn();
    render(<Summary {...defaultProps} onClearCart={onClearCart} />);

    fireEvent.click(screen.getByLabelText("clear-cart"));
    expect(onClearCart).toHaveBeenCalled();
  });
});
