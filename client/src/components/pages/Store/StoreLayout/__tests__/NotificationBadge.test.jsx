import { render, screen } from "@testing-library/react";

import { NotificationBadge } from "../NotificationBadge";

describe("NotificationBadge", () => {
  it("does not render when count is zero", () => {
    const { container } = render(<NotificationBadge count={0} className="badge" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the unread count", () => {
    render(<NotificationBadge count={7} className="badge" />);

    expect(screen.getByText("7")).toHaveClass("badge");
  });

  it("caps large counts at 99+", () => {
    render(<NotificationBadge count={120} className="badge" />);

    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});
