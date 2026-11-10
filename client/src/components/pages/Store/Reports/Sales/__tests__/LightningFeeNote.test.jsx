import { render, screen } from "@testing-library/react";

import { LightningFeeNote } from "../LightningFeeNote";

describe("LightningFeeNote", () => {
  it("renders the label and fee when feeSat is positive", () => {
    render(<LightningFeeNote label="sales.lightningFee" feeSat={50} />);
    expect(screen.getByText("sales.lightningFee: 50 sats")).toBeInTheDocument();
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
    render(<LightningFeeNote label="sales.lightningFee" feeSat={50} className="custom-class" />);
    expect(screen.getByText("sales.lightningFee: 50 sats")).toHaveClass("custom-class");
  });
});
