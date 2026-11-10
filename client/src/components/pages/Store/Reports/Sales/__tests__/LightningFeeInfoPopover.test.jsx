import { render, screen } from "@testing-library/react";

import { LightningFeeInfoPopover } from "../LightningFeeInfoPopover";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  const Popover = ({ children }) => <>{children}</>;
  const PopoverTrigger = ({ children }) => <>{children}</>;
  const PopoverContent = ({ children }) => <div data-testid="popover-content">{children}</div>;
  return { ...actual, Popover, PopoverTrigger, PopoverContent };
});

jest.mock("@/components/shared/AmountDisplay", () => ({
  AmountDisplay: ({ satoshis }) => <span>{`amount-display-${satoshis}`}</span>,
}));

describe("LightningFeeInfoPopover", () => {
  it("renders the trigger and popover content when feeSat is positive", () => {
    render(<LightningFeeInfoPopover label="sales.lightningFee" feeSat={50} infoText="Explains the fee" />);
    expect(screen.getByLabelText("sales.lightningFee")).toBeInTheDocument();
    expect(screen.getByTestId("popover-content")).toHaveTextContent("sales.lightningFee");
    expect(screen.getByText("amount-display-50")).toBeInTheDocument();
    expect(screen.getByTestId("popover-content")).toHaveTextContent("Explains the fee");
  });

  it("renders nothing when feeSat is zero", () => {
    const { container } = render(<LightningFeeInfoPopover label="sales.lightningFee" feeSat={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when feeSat is null", () => {
    const { container } = render(<LightningFeeInfoPopover label="sales.lightningFee" feeSat={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("applies the given className to the trigger button", () => {
    render(<LightningFeeInfoPopover label="sales.lightningFee" feeSat={50} className="custom-class" />);
    expect(screen.getByLabelText("sales.lightningFee")).toHaveClass("custom-class");
  });
});
