import { render, screen } from "@testing-library/react";

import { ElementText } from "../ElementText";

const businessConfig = { businessName: "Ambrosia" };

describe("ElementText", () => {
  it("renders plain text value", () => {
    render(<ElementText localId="t-1" templateText="Hello" businessConfig={null} className="text-left" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("resolves config variables", () => {
    render(
      <ElementText localId="t-2" templateText="{{config.businessName}}" businessConfig={businessConfig} className="text-left" />,
    );
    expect(screen.getByText("Ambrosia")).toBeInTheDocument();
  });

  it("applies className to the wrapper", () => {
    const { container } = render(
      <ElementText localId="t-3" templateText="X" businessConfig={null} className="text-center font-semibold" />,
    );
    expect(container.querySelector(".text-center.font-semibold")).toBeInTheDocument();
  });
});
