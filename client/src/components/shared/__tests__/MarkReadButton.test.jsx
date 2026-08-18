import { render, screen, fireEvent } from "@testing-library/react";

import { MarkReadButton } from "../MarkReadButton";

jest.mock("lucide-react", () => ({
  CheckCheck: () => <span data-testid="check-check-icon" />,
}));

jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, variant, className, size, "aria-label": ariaLabel }) => (
    <button
      aria-label={ariaLabel}
      className={className}
      data-size={size}
      data-variant={variant}
      onClick={onPress}
    >
      {children}
    </button>
  ),
}));

describe("MarkReadButton", () => {
  it("renders the check icon", () => {
    render(<MarkReadButton onPress={jest.fn()} />);

    expect(screen.getByTestId("check-check-icon")).toBeInTheDocument();
  });

  it("calls onPress when clicked", () => {
    const onPress = jest.fn();
    render(<MarkReadButton onPress={onPress} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("uses outline variant with green styles", () => {
    render(<MarkReadButton onPress={jest.fn()} />);

    const button = screen.getByRole("button");

    expect(button).toHaveAttribute("data-variant", "outline");
    expect(button).toHaveClass("border-green-800", "text-green-800");
  });

  it("applies icon-only sizing classes when no children", () => {
    render(<MarkReadButton onPress={jest.fn()} />);

    expect(screen.getByRole("button")).toHaveClass("w-8", "h-8", "min-w-0", "px-0");
  });

  it("applies responsive label sizing when children are provided", () => {
    render(<MarkReadButton onPress={jest.fn()}>Mark read</MarkReadButton>);

    const button = screen.getByRole("button");

    expect(button).toHaveClass("w-8", "min-w-0", "px-0");
    expect(button).toHaveClass("sm:w-auto", "sm:min-w-16", "sm:px-3");
    expect(screen.getByText("Mark read")).toHaveClass("hidden", "sm:inline");
  });

  it("shows full label sizing on mobile when requested", () => {
    render(
      <MarkReadButton onPress={jest.fn()} showLabelOnMobile>
        Mark read
      </MarkReadButton>,
    );

    const button = screen.getByRole("button");

    expect(button).toHaveClass("w-auto", "min-w-16", "px-3");
    expect(screen.getByText("Mark read")).not.toHaveClass("hidden", "sm:inline");
  });

  it("uses sm size by default and accepts a custom size", () => {
    const { rerender } = render(<MarkReadButton onPress={jest.fn()} />);

    expect(screen.getByRole("button")).toHaveAttribute("data-size", "sm");

    rerender(<MarkReadButton onPress={jest.fn()} size="md" />);

    expect(screen.getByRole("button")).toHaveAttribute("data-size", "md");
  });
});
