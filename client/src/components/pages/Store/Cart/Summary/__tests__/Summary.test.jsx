import { render, screen } from "@testing-library/react";

import { Summary } from "../Summary";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children, shadow, className }) => <div data-shadow={shadow} className={className}>{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardBody: ({ children }) => <div data-testid="card-body">{children}</div>,
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
});
