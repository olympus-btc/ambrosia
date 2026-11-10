import { render, screen } from "@testing-library/react";

import { LightningFeeNote } from "../LightningFeeNote";

jest.mock("@/components/shared/AmountDisplay", () => ({
  AmountDisplay: ({ satoshis }) => <span>{`amount-display-${satoshis}`}</span>,
}));

describe("LightningFeeNote", () => {
  it("renders the label and fee when feeSat is positive", () => {
    render(<LightningFeeNote label="sales.lightningFee" feeSat={50} />);
    expect(screen.getByText("sales.lightningFee:")).toBeInTheDocument();
    expect(screen.getByText("amount-display-50")).toBeInTheDocument();
  });

  it("renders nothing when feeSat is zero", () => {
    const { container } = render(<LightningFeeNote label="sales.lightningFee" feeSat={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when feeSat is null", () => {
    const { container } = render(<LightningFeeNote label="sales.lightningFee" feeSat={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("applies the given className", () => {
    const { container } = render(
      <LightningFeeNote label="sales.lightningFee" feeSat={50} className="custom-class" />,
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
