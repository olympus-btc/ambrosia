import { render, screen } from "@testing-library/react";

import { ElementTableRow } from "../ElementTableRow";

import { previewSampleTicket } from "./utils/previewSampleTicket";

function Wrapper({ localId, className }) {
  return <div>{ElementTableRow({ localId, sampleTicket: previewSampleTicket, className })}</div>;
}

describe("ElementTableRow", () => {
  it("renders all sample ticket items with quantity and name", () => {
    render(<Wrapper localId="r-1" className="" />);
    expect(screen.getByText("2x Pina colada")).toBeInTheDocument();
    expect(screen.getByText("1x Limonada")).toBeInTheDocument();
  });

  it("renders item prices", () => {
    render(<Wrapper localId="r-2" className="" />);
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
  });

  it("renders item comments prefixed with dash", () => {
    render(<Wrapper localId="r-3" className="" />);
    expect(screen.getByText("- sin azucar")).toBeInTheDocument();
  });

  it("applies className to row elements", () => {
    const { container } = render(<Wrapper localId="r-4" className="text-right" />);
    expect(container.querySelectorAll(".text-right").length).toBeGreaterThan(0);
  });
});
