import { act, render, screen } from "@testing-library/react";

import { CartTotals } from "../CartTotals";

let capturedOnPreview;
let mockCanApplyDiscount = true;

jest.mock("../DiscountInput", () => ({
  DiscountInput: ({ onPreview }) => {
    capturedOnPreview = onPreview;
    return <div data-testid="discount-input" />;
  },
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({ formatAmount: (value) => `fmt-${value}` }),
}));

jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => mockCanApplyDiscount,
}));

const defaultProps = {
  subtotal: 1000,
  discountAmount: 100,
  discount: 10,
  discountType: "percentage",
  onApplyDiscount: jest.fn(),
};

describe("CartTotals", () => {
  beforeEach(() => {
    mockCanApplyDiscount = true;
  });

  it("renders the subtotal when there is a discount", () => {
    render(<CartTotals {...defaultProps} />);
    expect(screen.getByText("fmt-1000")).toBeInTheDocument();
  });

  it("hides subtotal when there is no discount", () => {
    render(<CartTotals {...defaultProps} discountAmount={0} discount={0} />);
    expect(screen.queryByText("summary.subtotal")).not.toBeInTheDocument();
  });

  it("renders the total", () => {
    render(<CartTotals {...defaultProps} />);
    expect(screen.getByText("fmt-900")).toBeInTheDocument();
  });

  describe("discount permission", () => {
    it("shows DiscountInput when user has orders_discount permission", () => {
      mockCanApplyDiscount = true;
      render(<CartTotals {...defaultProps} />);
      expect(screen.getByTestId("discount-input")).toBeInTheDocument();
    });

    it("hides DiscountInput when user lacks orders_discount permission", () => {
      mockCanApplyDiscount = false;
      render(<CartTotals {...defaultProps} />);
      expect(screen.queryByTestId("discount-input")).not.toBeInTheDocument();
    });

    it("shows read-only percentage discount when user lacks permission and discount is applied", () => {
      mockCanApplyDiscount = false;
      render(<CartTotals {...defaultProps} discount={10} discountType="percentage" />);
      expect(screen.getByText("10%")).toBeInTheDocument();
    });

    it("shows read-only fixed discount when user lacks permission and discount is applied", () => {
      mockCanApplyDiscount = false;
      render(<CartTotals {...defaultProps} discount={5} discountType="fixed" />);
      expect(screen.getByText("fmt-500")).toBeInTheDocument();
    });

    it("shows nothing in place of discount input when user lacks permission and no discount is applied", () => {
      mockCanApplyDiscount = false;
      render(<CartTotals {...defaultProps} discount={0} discountAmount={0} />);
      expect(screen.queryByTestId("discount-input")).not.toBeInTheDocument();
      expect(screen.queryByText("summary.discount")).not.toBeInTheDocument();
    });
  });

  describe("real-time preview", () => {
    it("updates total with percentage preview while typing", () => {
      render(<CartTotals {...defaultProps} discountAmount={0} discount={0} />);
      act(() => capturedOnPreview(20, "percentage"));
      expect(screen.getByText("fmt-800")).toBeInTheDocument();
    });

    it("updates total with fixed amount preview while typing", () => {
      render(<CartTotals {...defaultProps} discountAmount={0} discount={0} />);
      act(() => capturedOnPreview(3, "fixed"));
      expect(screen.getByText("fmt-700")).toBeInTheDocument();
    });

    it("shows subtotal row when preview discount is active", () => {
      render(<CartTotals {...defaultProps} discountAmount={0} discount={0} />);
      act(() => capturedOnPreview(10, "percentage"));
      expect(screen.getByText("summary.subtotal")).toBeInTheDocument();
    });

    it("resets to applied discount when preview is cleared", () => {
      render(<CartTotals {...defaultProps} discountAmount={100} discount={10} />);
      act(() => capturedOnPreview(50, "percentage"));
      expect(screen.getByText("fmt-500")).toBeInTheDocument();
      act(() => capturedOnPreview(null));
      expect(screen.getByText("fmt-900")).toBeInTheDocument();
    });
  });
});
