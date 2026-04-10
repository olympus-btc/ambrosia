import { render, screen } from "@testing-library/react";

import { NavIcon } from "../NavIcon";

jest.mock("lucide-react", () => ({
  ShoppingCart: () => <div>ShoppingCart Icon</div>,
  FileText: () => <div>FileText Icon</div>,
  Box: () => <div>Box Icon</div>,
}));

describe("NavIcon", () => {
  it("renders a known icon by name", () => {
    render(<NavIcon name="box" />);
    expect(screen.getByText("Box Icon")).toBeInTheDocument();
  });

  it("converts kebab-case to PascalCase", () => {
    render(<NavIcon name="shopping-cart" />);
    expect(screen.getByText("ShoppingCart Icon")).toBeInTheDocument();
  });

  it("falls back to FileText for unknown icon names", () => {
    render(<NavIcon name="unknown-icon-xyz" />);
    expect(screen.getByText("FileText Icon")).toBeInTheDocument();
  });

  it("applies default className when none is provided", () => {
    const { container } = render(<NavIcon name="box" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
