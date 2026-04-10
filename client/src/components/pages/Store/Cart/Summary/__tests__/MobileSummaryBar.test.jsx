import { render, screen, fireEvent } from "@testing-library/react";

import { MobileSummaryBar } from "../MobileSummaryBar";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({ formatAmount: (value) => `fmt-${value}` }),
}));

jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, className }) => (
    <button className={className} onClick={onPress}>{children}</button>
  ),
}));

jest.mock("lucide-react", () => ({
  ShoppingCart: () => <svg data-testid="cart-icon" />,
}));

const defaultProps = {
  cart: [{ id: 1 }, { id: 2 }],
  total: 5000,
  onCheckout: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("MobileSummaryBar", () => {
  it("renders nothing when cart is empty", () => {
    const { container } = render(<MobileSummaryBar {...defaultProps} cart={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("renders cart icon and item count", () => {
    render(<MobileSummaryBar {...defaultProps} />);

    expect(screen.getByTestId("cart-icon")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders formatted total", () => {
    render(<MobileSummaryBar {...defaultProps} />);

    expect(screen.getByText("fmt-5000")).toBeInTheDocument();
  });

  it("renders checkout button with translation key", () => {
    render(<MobileSummaryBar {...defaultProps} />);

    expect(screen.getByText("summary.viewCart")).toBeInTheDocument();
  });

  it("calls onCheckout when button is pressed", () => {
    const onCheckout = jest.fn();
    render(<MobileSummaryBar {...defaultProps} onCheckout={onCheckout} />);

    fireEvent.click(screen.getByText("summary.viewCart"));
    expect(onCheckout).toHaveBeenCalled();
  });
});
