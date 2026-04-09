import { render } from "@testing-library/react";

import { ElementLineBreak } from "../ElementLineBreak";

describe("ElementLineBreak", () => {
  it("renders a spacer div with h-3 class", () => {
    const { container } = render(<ElementLineBreak />);
    expect(container.querySelector(".h-3")).toBeInTheDocument();
  });
});
