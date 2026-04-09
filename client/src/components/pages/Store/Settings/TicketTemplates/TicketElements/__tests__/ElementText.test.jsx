import { render, screen } from "@testing-library/react";

import { ElementText } from "../ElementText";

const config = { businessName: "Ambrosia" };

describe("ElementText", () => {
  it("renders plain text value", () => {
    render(<ElementText localId="t-1" value="Hello" config={null} className="text-left" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("resolves config variables", () => {
    render(
      <ElementText localId="t-2" value="{{config.businessName}}" config={config} className="text-left" />,
    );
    expect(screen.getByText("Ambrosia")).toBeInTheDocument();
  });

  it("applies className to the wrapper", () => {
    const { container } = render(
      <ElementText localId="t-3" value="X" config={null} className="text-center font-semibold" />,
    );
    expect(container.querySelector(".text-center.font-semibold")).toBeInTheDocument();
  });
});
