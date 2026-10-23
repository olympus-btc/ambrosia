import { render, screen, fireEvent } from "@testing-library/react";

import { TipSelector } from "../TipSelector";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({ formatAmount: (value) => `fmt-${value}` }),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const { NumberInputMock } = require("@/test-utils/numberInputMock");
  return {
    ...actual,
    Button: ({ children, onPress, ...props }) => (
      <button onClick={onPress} {...props}>
        {children}
      </button>
    ),
    NumberInput: (numberInputProps) => (
      <NumberInputMock {...numberInputProps} data-testid="tip-number-input" />
    ),
  };
});

const defaultProps = {
  tip: 0,
  tipType: "percentage",
  onApply: jest.fn(),
  onPreview: jest.fn(),
  suggestedPercentages: [10, 15, 20],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("TipSelector", () => {
  it("renders suggested percentage buttons and no-tip button", () => {
    render(<TipSelector {...defaultProps} />);

    expect(screen.getByText("summary.noTip")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.getByText("15%")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("summary.customTip")).toBeInTheDocument();
  });

  it("renders the calculated amount as secondary text without duplicating the percentage", () => {
    render(<TipSelector {...defaultProps} tip={10} formattedTipAmount="+$1.20" />);

    expect(screen.getByText("+$1.20")).toHaveClass("text-gray-500");
    expect(screen.getAllByText("10%")).toHaveLength(1);
  });

  it("calls onApply with chosen percentage preset", () => {
    render(<TipSelector {...defaultProps} />);

    fireEvent.click(screen.getByText("15%"));
    expect(defaultProps.onApply).toHaveBeenCalledWith(15, "percentage");
  });

  it("calls onApply with 0 when clicking no tip", () => {
    render(<TipSelector {...defaultProps} tip={15} />);

    fireEvent.click(screen.getByText("summary.noTip"));
    expect(defaultProps.onApply).toHaveBeenCalledWith(0, "percentage");
  });

  it("opens custom input and applies custom tip", () => {
    render(<TipSelector {...defaultProps} />);

    fireEvent.click(screen.getByText("summary.customTip"));
    expect(screen.getByTestId("tip-number-input")).toBeInTheDocument();
    expect(screen.getByText("summary.tipApply")).toBeInTheDocument();

    const tipInput = screen.getByTestId("tip-number-input");
    fireEvent.change(tipInput, { target: { value: "25" } });

    fireEvent.click(screen.getByText("summary.tipApply"));
    expect(defaultProps.onApply).toHaveBeenCalledWith(25, "percentage");
  });

  it("toggles between percentage and fixed in custom mode", () => {
    render(<TipSelector {...defaultProps} />);

    fireEvent.click(screen.getByText("summary.customTip"));
    const fixedButton = screen.getByText("$");
    fireEvent.click(fixedButton);

    const tipInput = screen.getByTestId("tip-number-input");
    fireEvent.change(tipInput, { target: { value: "50" } });

    fireEvent.click(screen.getByText("summary.tipApply"));
    expect(defaultProps.onApply).toHaveBeenCalledWith(50, "fixed");
  });

  it("opens custom mode with the configured default tip type when no tip is applied", () => {
    render(<TipSelector {...defaultProps} tipType="percentage" defaultCustomTipType="fixed" />);

    fireEvent.click(screen.getByText("summary.customTip"));
    fireEvent.change(screen.getByTestId("tip-number-input"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("summary.tipApply"));

    expect(defaultProps.onApply).toHaveBeenCalledWith(3, "fixed");
  });

  it("keeps the applied tip type over the configured default when reopening custom mode", () => {
    render(<TipSelector {...defaultProps} tip={12} tipType="percentage" defaultCustomTipType="fixed" />);

    fireEvent.click(screen.getByText("summary.customTip"));
    fireEvent.click(screen.getByText("summary.tipApply"));

    expect(defaultProps.onApply).toHaveBeenCalledWith(12, "percentage");
  });
});
