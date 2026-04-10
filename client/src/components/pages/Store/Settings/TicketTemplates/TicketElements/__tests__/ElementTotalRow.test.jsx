import { render, screen } from "@testing-library/react";

import { ElementTotalRow } from "../ElementTotalRow";

const config = { businessName: "Ambrosia" };

function Wrapper({ localId, value, config, className }) {
  return <div>{ElementTotalRow({ localId, value, config, className })}</div>;
}

describe("ElementTotalRow", () => {
  it("renders TOTAL as default label when value is empty", () => {
    render(<Wrapper localId="tr-1" value="" config={null} className="" />);
    expect(screen.getByText("TOTAL")).toBeInTheDocument();
  });

  it("renders resolved label when value is a config variable", () => {
    render(<Wrapper localId="tr-2" value="{{config.businessName}}" config={config} className="" />);
    expect(screen.getByText("Ambrosia")).toBeInTheDocument();
  });

  it("renders the sample total amount", () => {
    render(<Wrapper localId="tr-3" value="" config={null} className="" />);
    expect(screen.getByText("215")).toBeInTheDocument();
  });

  it("renders a separator line above the total", () => {
    const { container } = render(<Wrapper localId="tr-4" value="" config={null} className="" />);
    expect(container.querySelector(".border-t")).toBeInTheDocument();
  });

  it("applies className to the total row", () => {
    const { container } = render(
      <Wrapper localId="tr-5" value="" config={null} className="text-center" />,
    );
    expect(container.querySelector(".text-center")).toBeInTheDocument();
  });
});
