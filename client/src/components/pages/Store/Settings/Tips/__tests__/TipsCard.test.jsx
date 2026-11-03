import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { usePermission } from "@/hooks/usePermission";

import { TipsCard } from "../TipsCard";

jest.mock("@/hooks/usePermission", () => ({
  usePermission: jest.fn(),
}));

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const { NumberInputMock } = require("@/test-utils/numberInputMock");
  return {
    ...actual,
    Switch: ({ isSelected, onValueChange, isDisabled, "aria-label": ariaLabel }) => (
      <input
        type="checkbox"
        aria-label={ariaLabel}
        checked={isSelected}
        disabled={isDisabled}
        onChange={(e) => onValueChange(e.target.checked)}
      />
    ),
    Button: ({ children, onPress, isDisabled, isLoading, "aria-pressed": ariaPressed }) => (
      <button
        onClick={onPress}
        disabled={isDisabled || isLoading}
        aria-pressed={ariaPressed}
      >
        {children}
      </button>
    ),
    NumberInput: (props) => <NumberInputMock {...props} />,
  };
});

describe("TipsCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePermission.mockReturnValue(true);
  });

  it("renders with default props and values", () => {
    render(<TipsCard tipsEnabled tipPercentages="10,15,20" />);

    expect(screen.getByText("cardTips.title")).toBeInTheDocument();
    expect(screen.getByLabelText("cardTips.enableTips")).toBeChecked();
    expect(screen.getByRole("button", { name: "10%" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "15%" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "20%" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "5%" })).toHaveAttribute("aria-pressed", "false");
  });

  it("hides percentage buttons when tips are disabled", () => {
    render(<TipsCard tipsEnabled={false} tipPercentages="10,15,20" />);

    expect(screen.queryByRole("group", { name: "cardTips.percentagesLabel" })).not.toBeInTheDocument();
  });

  it("calls onSave when save button is clicked with modified values", async () => {
    const handleSave = jest.fn().mockResolvedValue(true);
    render(
      <TipsCard
        tipsEnabled
        tipPercentages="10,15,20"
        onSave={handleSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "5%" }));

    const saveButton = screen.getByText("cardTips.saveButton");
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith({
        tipsEnabled: true,
        tipPercentages: "5,10,15,20",
        customTipDefaultType: "percentage",
      });
    });
  });

  it("disables save button when there are no changes", () => {
    render(<TipsCard tipsEnabled tipPercentages="10,15,20" onSave={jest.fn()} />);

    const saveButton = screen.getByText("cardTips.saveButton");
    expect(saveButton).toBeDisabled();
  });

  it("requires at least one selected percentage", () => {
    render(<TipsCard tipsEnabled tipPercentages="10,15,20" onSave={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "10%" }));
    fireEvent.click(screen.getByRole("button", { name: "15%" }));
    fireEvent.click(screen.getByRole("button", { name: "20%" }));

    expect(screen.getByText("cardTips.percentagesError")).toBeInTheDocument();
    expect(screen.getByText("cardTips.saveButton")).toBeDisabled();
  });

  it("preserves configured non-standard percentages as selectable buttons", async () => {
    const handleSave = jest.fn().mockResolvedValue(true);
    render(<TipsCard tipsEnabled tipPercentages="10.5,20" onSave={handleSave} />);

    expect(screen.getByRole("button", { name: "10.5%" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "5%" }));
    fireEvent.click(screen.getByText("cardTips.saveButton"));

    await waitFor(() => expect(handleSave).toHaveBeenCalledWith({
      tipsEnabled: true,
      tipPercentages: "5,10.5,20",
      customTipDefaultType: "percentage",
    }));
  });

  it("adds a custom percentage as a selected button", async () => {
    const handleSave = jest.fn().mockResolvedValue(true);
    render(<TipsCard tipsEnabled tipPercentages="10,15,20" onSave={handleSave} />);

    fireEvent.click(screen.getByRole("button", { name: "cardTips.customPercentage" }));
    fireEvent.change(screen.getByLabelText("cardTips.customPercentageLabel"), {
      target: { value: "12.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "cardTips.addPercentage" }));

    expect(screen.getByRole("button", { name: "12.5%" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByText("cardTips.saveButton"));

    await waitFor(() => expect(handleSave).toHaveBeenCalledWith({
      tipsEnabled: true,
      tipPercentages: "10,12.5,15,20",
      customTipDefaultType: "percentage",
    }));
  });

  it("does not allow duplicate custom percentages", () => {
    render(<TipsCard tipsEnabled tipPercentages="10,15,20" onSave={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "cardTips.customPercentage" }));
    fireEvent.change(screen.getByLabelText("cardTips.customPercentageLabel"), {
      target: { value: "10" },
    });

    expect(screen.getByRole("button", { name: "cardTips.addPercentage" })).toBeDisabled();
  });

  it("marks the configured custom tip default type as selected", () => {
    render(<TipsCard tipsEnabled tipPercentages="10,15,20" customTipDefaultType="fixed" />);

    expect(screen.getByRole("button", { name: "$" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "%" })).toHaveAttribute("aria-pressed", "false");
  });

  it("saves the selected custom tip default type", async () => {
    const handleSave = jest.fn().mockResolvedValue(true);
    render(<TipsCard tipsEnabled tipPercentages="10,15,20" onSave={handleSave} />);

    fireEvent.click(screen.getByRole("button", { name: "$" }));
    fireEvent.click(screen.getByText("cardTips.saveButton"));

    await waitFor(() => expect(handleSave).toHaveBeenCalledWith({
      tipsEnabled: true,
      tipPercentages: "10,15,20",
      customTipDefaultType: "fixed",
    }));
  });
});
