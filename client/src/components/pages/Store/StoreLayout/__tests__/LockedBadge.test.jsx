import { fireEvent, render, screen } from "@testing-library/react";

import { LockedBadge } from "../LockedBadge";

describe("LockedBadge", () => {
  it("does not render when isLocked is false", () => {
    const { container } = render(<LockedBadge isLocked={false} className="badge" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders when isLocked is true", () => {
    render(<LockedBadge isLocked onClick={() => {}} className="badge" />);

    expect(screen.getByLabelText("Secrets locked")).toHaveClass("badge");
  });

  it("calls onClick when pressed", () => {
    const onClick = jest.fn();
    render(<LockedBadge isLocked onClick={onClick} />);

    fireEvent.click(screen.getByLabelText("Secrets locked"));

    expect(onClick).toHaveBeenCalled();
  });

  it("stops the click from reaching an enclosing link", () => {
    const onClick = jest.fn();
    const onLinkClick = jest.fn();
    render(
      <a href="#" onClick={onLinkClick}>
        <LockedBadge isLocked onClick={onClick} />
      </a>,
    );

    fireEvent.click(screen.getByLabelText("Secrets locked"));

    expect(onClick).toHaveBeenCalled();
    expect(onLinkClick).not.toHaveBeenCalled();
  });
});
