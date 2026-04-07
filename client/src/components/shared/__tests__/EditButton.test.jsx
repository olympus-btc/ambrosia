import { render, screen, fireEvent } from "@testing-library/react";

import { EditButton } from "../EditButton";

jest.mock("lucide-react", () => ({
  Pencil: () => <span data-testid="pencil-icon" />,
}));

jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, variant, className, size }) => (
    <button onClick={onPress} data-variant={variant} className={className} data-size={size}>
      {children}
    </button>
  ),
}));

describe("EditButton", () => {
  it("renders the pencil icon", () => {
    render(<EditButton onPress={jest.fn()} />);

    expect(screen.getByTestId("pencil-icon")).toBeInTheDocument();
  });

  it("calls onPress when clicked", () => {
    const onPress = jest.fn();
    render(<EditButton onPress={onPress} />);

    fireEvent.click(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("uses outline variant with green styles", () => {
    render(<EditButton onPress={jest.fn()} />);

    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-variant", "outline");
    expect(btn).toHaveClass("border-green-800", "text-green-800");
  });

  it("applies icon-only sizing classes when no children", () => {
    render(<EditButton onPress={jest.fn()} />);

    expect(screen.getByRole("button")).toHaveClass("w-8", "min-w-0", "px-0");
  });

  it("applies compact sizing on mobile and expands on sm+ when children are provided", () => {
    render(<EditButton onPress={jest.fn()}>Edit</EditButton>);

    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("w-8", "min-w-0", "px-0");
    expect(btn).toHaveClass("sm:w-auto", "sm:min-w-16", "sm:px-3");
  });

  it("renders children when provided", () => {
    render(<EditButton onPress={jest.fn()}>Edit</EditButton>);

    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("uses sm size by default", () => {
    render(<EditButton onPress={jest.fn()} />);

    expect(screen.getByRole("button")).toHaveAttribute("data-size", "sm");
  });

  it("accepts a custom size", () => {
    render(<EditButton onPress={jest.fn()} size="md" />);

    expect(screen.getByRole("button")).toHaveAttribute("data-size", "md");
  });
});
