import { render, screen, fireEvent } from "@testing-library/react";

import { ViewButton } from "../ViewButton";

jest.mock("lucide-react", () => ({
  Eye: () => <span data-testid="eye-icon" />,
}));

jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, variant, className, size }) => (
    <button onClick={onPress} data-variant={variant} className={className} data-size={size}>
      {children}
    </button>
  ),
}));

describe("ViewButton", () => {
  it("renders the eye icon", () => {
    render(<ViewButton onPress={jest.fn()} />);

    expect(screen.getByTestId("eye-icon")).toBeInTheDocument();
  });

  it("calls onPress when clicked", () => {
    const onPress = jest.fn();
    render(<ViewButton onPress={onPress} />);

    fireEvent.click(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("uses outline variant with green styles", () => {
    render(<ViewButton onPress={jest.fn()} />);

    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-variant", "outline");
    expect(btn).toHaveClass("border-green-800", "text-green-800");
  });

  it("applies icon-only sizing classes when no children", () => {
    render(<ViewButton onPress={jest.fn()} />);

    expect(screen.getByRole("button")).toHaveClass("w-8", "min-w-0", "px-0");
  });

  it("applies responsive sizing classes when children are provided", () => {
    render(<ViewButton onPress={jest.fn()}>View</ViewButton>);

    const btn = screen.getByRole("button");

    expect(btn).toHaveClass("w-8", "min-w-0", "px-0");
    expect(btn).toHaveClass("sm:w-auto", "sm:min-w-16", "sm:px-3");
  });

  it("renders children hidden on mobile via hidden sm:inline span", () => {
    render(<ViewButton onPress={jest.fn()}>View</ViewButton>);

    const span = screen.getByText("View");
    expect(span.tagName).toBe("SPAN");
    expect(span).toHaveClass("hidden", "sm:inline");
  });

  it("does not render children span when no children provided", () => {
    render(<ViewButton onPress={jest.fn()} />);

    expect(screen.queryByRole("span")).not.toBeInTheDocument();
  });

  it("uses sm size by default", () => {
    render(<ViewButton onPress={jest.fn()} />);

    expect(screen.getByRole("button")).toHaveAttribute("data-size", "sm");
  });

  it("accepts a custom size", () => {
    render(<ViewButton onPress={jest.fn()} size="md" />);

    expect(screen.getByRole("button")).toHaveAttribute("data-size", "md");
  });
});
