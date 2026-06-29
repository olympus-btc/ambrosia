import { render, screen, fireEvent } from "@testing-library/react";

import { DiscountInput } from "../DiscountInput";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({ formatAmount: (value) => `fmt-${value}` }),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  return {
    ...actual,
    Button: ({ children, onPress }) => <button onClick={onPress}>{children}</button>,
    NumberInput: ({ value, onValueChange, onChange, onKeyDown }) => (
      <input
        data-testid="discount-number-input"
        value={value}
        onChange={(event) => {
          onValueChange?.(parseFloat(event.target.value) || 0);
          onChange?.(event);
        }}
        onKeyDown={onKeyDown}
      />
    ),
  };
});

const defaultProps = {
  discount: 0,
  discountType: "percentage",
  onApply: jest.fn(),
  onPreview: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("DiscountInput", () => {
  describe("default view", () => {
    it("shows Add button when no discount is applied", () => {
      render(<DiscountInput {...defaultProps} />);
      expect(screen.getByText("summary.discountAdd")).toBeInTheDocument();
      expect(screen.queryByText("summary.discountRemove")).not.toBeInTheDocument();
    });

    it("shows percentage label and Remove button when discount is applied", () => {
      render(<DiscountInput {...defaultProps} discount={10} />);
      expect(screen.getByText(/10%/)).toBeInTheDocument();
      expect(screen.getByText("summary.discountRemove")).toBeInTheDocument();
      expect(screen.queryByText("summary.discountAdd")).not.toBeInTheDocument();
    });

    it("shows formatted amount label when fixed discount is applied", () => {
      render(<DiscountInput {...defaultProps} discount={5} discountType="fixed" />);
      expect(screen.getByText(/fmt-500/)).toBeInTheDocument();
    });

    it("calls onApply with 0 when Remove is pressed", () => {
      const onApply = jest.fn();
      render(<DiscountInput {...defaultProps} discount={10} discountType="percentage" onApply={onApply} />);
      fireEvent.click(screen.getByText("summary.discountRemove"));
      expect(onApply).toHaveBeenCalledWith(0, "percentage");
    });
  });

  describe("editing view", () => {
    function enterEditingMode(props = {}) {
      render(<DiscountInput {...defaultProps} {...props} />);
      fireEvent.click(screen.getByText("summary.discountAdd"));
    }

    it("shows number input and Apply button when Add is pressed", () => {
      enterEditingMode();
      expect(screen.getByTestId("discount-number-input")).toBeInTheDocument();
      expect(screen.getByText("summary.discountApply")).toBeInTheDocument();
    });

    it("shows percentage and fixed type toggle buttons", () => {
      enterEditingMode();
      expect(screen.getByText("%")).toBeInTheDocument();
      expect(screen.getByText("$")).toBeInTheDocument();
    });

    it("calls onPreview while typing", () => {
      const onPreview = jest.fn();
      enterEditingMode({ onPreview });
      fireEvent.change(screen.getByTestId("discount-number-input"), { target: { value: "20" } });
      expect(onPreview).toHaveBeenCalledWith(20, "percentage");
    });

    it("calls onPreview with new type when switching discount type", () => {
      const onPreview = jest.fn();
      enterEditingMode({ onPreview });
      fireEvent.click(screen.getByText("$"));
      expect(onPreview).toHaveBeenCalledWith(0, "fixed");
    });

    it("calls onApply and onPreview(null) when Apply is pressed", () => {
      const onApply = jest.fn();
      const onPreview = jest.fn();
      enterEditingMode({ onApply, onPreview });
      fireEvent.change(screen.getByTestId("discount-number-input"), { target: { value: "15" } });
      fireEvent.click(screen.getByText("summary.discountApply"));
      expect(onApply).toHaveBeenCalledWith(15, "percentage");
      expect(onPreview).toHaveBeenCalledWith(null);
    });

    it("applies on Enter keydown", () => {
      const onApply = jest.fn();
      enterEditingMode({ onApply });
      const input = screen.getByTestId("discount-number-input");
      fireEvent.change(input, { target: { value: "10" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onApply).toHaveBeenCalledWith(10, "percentage");
    });

    it("exits editing and calls onPreview(null) on Escape", () => {
      const onPreview = jest.fn();
      enterEditingMode({ onPreview });
      fireEvent.keyDown(screen.getByTestId("discount-number-input"), { key: "Escape" });
      expect(onPreview).toHaveBeenCalledWith(null);
      expect(screen.getByText("summary.discountAdd")).toBeInTheDocument();
    });

    it("does not call onApply when percentage value exceeds 100", () => {
      const onApply = jest.fn();
      enterEditingMode({ onApply });
      fireEvent.change(screen.getByTestId("discount-number-input"), { target: { value: "150" } });
      fireEvent.click(screen.getByText("summary.discountApply"));
      expect(onApply).not.toHaveBeenCalled();
    });
  });
});
