import { render } from "@testing-library/react";

import { ElementSeparator } from "../ElementSeparator";

describe("ElementSeparator", () => {
  it("renders a dashed horizontal line", () => {
    const { container } = render(<ElementSeparator />);
    expect(container.querySelector(".border-dashed")).toBeInTheDocument();
  });
});
