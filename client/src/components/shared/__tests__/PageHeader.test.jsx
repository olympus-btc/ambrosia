import { render, screen } from "@testing-library/react";

import { PageHeader } from "../PageHeader";

describe("PageHeader", () => {
  it("renders the title", () => {
    render(<PageHeader title="Users" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Users");
  });

  it("renders subtitle when provided", () => {
    render(<PageHeader title="Users" subtitle="Manage your users" />);
    expect(screen.getByText("Manage your users")).toBeInTheDocument();
  });

  it("does not render subtitle when not provided", () => {
    render(<PageHeader title="Users" />);
    expect(screen.queryByText("Manage your users")).not.toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(<PageHeader title="Users" actions={<button>Add User</button>} />);
    expect(screen.getByRole("button", { name: "Add User" })).toBeInTheDocument();
  });

  it("does not render actions slot when not provided", () => {
    const { container } = render(<PageHeader title="Users" />);
    expect(container.querySelectorAll("header > div")).toHaveLength(1);
  });

  it("applies justify-between when actions are provided", () => {
    const { container } = render(
      <PageHeader title="Users" actions={<button>Add</button>} />,
    );
    expect(container.querySelector("header")).toHaveClass("justify-between");
  });

  it("does not apply justify-between without actions", () => {
    const { container } = render(<PageHeader title="Users" />);
    expect(container.querySelector("header")).not.toHaveClass("justify-between");
  });

  it("always applies mb-6", () => {
    const { container } = render(<PageHeader title="Users" />);
    expect(container.querySelector("header")).toHaveClass("mb-6");
  });

  it("title has correct typography classes", () => {
    render(<PageHeader title="Users" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass(
      "text-2xl",
      "md:text-4xl",
      "font-semibold",
      "text-green-900",
    );
  });

  it("subtitle has responsive size and spacing classes", () => {
    const { container } = render(<PageHeader title="Users" subtitle="Manage" />);
    const subtitle = container.querySelector("p");
    expect(subtitle).toHaveClass("text-sm", "md:text-base", "mt-2", "md:mt-4");
  });
});
