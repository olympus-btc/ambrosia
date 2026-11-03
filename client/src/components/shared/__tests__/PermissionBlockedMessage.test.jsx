import { render, screen } from "@testing-library/react";

import { PermissionBlockedMessage } from "../PermissionBlockedMessage";

describe("PermissionBlockedMessage", () => {
  it("renders the title and subtitle", () => {
    render(<PermissionBlockedMessage title="You can't view orders" subtitle="Ask an administrator" />);

    expect(screen.getByText("You can't view orders")).toBeInTheDocument();
    expect(screen.getByText("Ask an administrator")).toBeInTheDocument();
  });

  it("renders the icon", () => {
    const { container } = render(<PermissionBlockedMessage title="Blocked" subtitle="Missing permission" />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
