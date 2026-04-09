import { render, screen, fireEvent } from "@testing-library/react";

import { DeleteButton } from "../DeleteButton";

jest.mock("lucide-react", () => ({
  Trash: () => <span data-testid="trash-icon" />,
}));

jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, variant, className, size }) => (
    <button onClick={onPress} data-variant={variant} className={className} data-size={size}>
      {children}
    </button>
  ),
}));

describe("DeleteButton", () => {
  it("renders the trash icon", () => {
    render(<DeleteButton onPress={jest.fn()} />);

    expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
  });

  it("calls onPress when clicked", () => {
    const onPress = jest.fn();
    render(<DeleteButton onPress={onPress} />);

    fireEvent.click(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("uses outline variant with red styles", () => {
    render(<DeleteButton onPress={jest.fn()} />);

    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-variant", "outline");
    expect(btn).toHaveClass("border-red-600", "text-red-600");
  });

  it("applies icon-only sizing classes when no children", () => {
    render(<DeleteButton onPress={jest.fn()} />);

    expect(screen.getByRole("button")).toHaveClass("w-8", "min-w-0", "px-0");
  });

  it("applies responsive sizing classes when children are provided", () => {
    render(<DeleteButton onPress={jest.fn()}>Delete</DeleteButton>);

    const btn = screen.getByRole("button");

    expect(btn).toHaveClass("w-8", "min-w-0", "px-0");
    expect(btn).toHaveClass("sm:w-auto", "sm:min-w-16", "sm:px-3");
  });

  it("renders children when provided", () => {
    render(<DeleteButton onPress={jest.fn()}>Delete</DeleteButton>);

    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("uses sm size by default", () => {
    render(<DeleteButton onPress={jest.fn()} />);

    expect(screen.getByRole("button")).toHaveAttribute("data-size", "sm");
  });

  it("accepts a custom size", () => {
    render(<DeleteButton onPress={jest.fn()} size="md" />);

    expect(screen.getByRole("button")).toHaveAttribute("data-size", "md");
  });
});
