import { fireEvent, render, screen } from "@testing-library/react";

import { TemplateVariablePicker } from "../TicketTemplate/TemplateVariablePicker";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, "aria-label": ariaLabel, isIconOnly, ...props }) => (
    <button type="button" onClick={onPress} aria-label={ariaLabel} {...props}>
      {children}
    </button>
  ),
  Chip: ({ onClick, children, ...props }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Popover: ({ children }) => <div>{children}</div>,
  PopoverTrigger: ({ children }) => <div>{children}</div>,
  PopoverContent: ({ children }) => <div>{children}</div>,
}));

jest.mock("lucide-react", () => ({
  Braces: () => <svg data-testid="braces-icon" />,
}));

const t = (key) => key;

describe("TemplateVariablePicker", () => {
  it("renders the trigger button", () => {
    render(<TemplateVariablePicker onSelect={jest.fn()} t={t} />);
    expect(screen.getByRole("button", { name: "templates.variables.title" })).toBeInTheDocument();
  });

  it("renders config variable chips", () => {
    render(<TemplateVariablePicker onSelect={jest.fn()} t={t} />);
    expect(screen.getByText("templates.variables.businessName")).toBeInTheDocument();
    expect(screen.getByText("templates.variables.businessAddress")).toBeInTheDocument();
    expect(screen.getByText("templates.variables.businessPhone")).toBeInTheDocument();
    expect(screen.getByText("templates.variables.businessEmail")).toBeInTheDocument();
  });

  it("does not render ticket group chips", () => {
    render(<TemplateVariablePicker onSelect={jest.fn()} t={t} />);
    expect(screen.queryByText("templates.variables.ticketId")).not.toBeInTheDocument();
    expect(screen.queryByText("templates.variables.tableName")).not.toBeInTheDocument();
    expect(screen.queryByText("templates.variables.total")).not.toBeInTheDocument();
  });

  it("calls onSelect with the correct variable key when a chip is clicked", () => {
    const onSelect = jest.fn();
    render(<TemplateVariablePicker onSelect={onSelect} t={t} />);
    fireEvent.click(screen.getByText("templates.variables.businessName"));
    expect(onSelect).toHaveBeenCalledWith("{{config.businessName}}");
  });

  it("calls onSelect with the correct key for each config variable", () => {
    const onSelect = jest.fn();
    render(<TemplateVariablePicker onSelect={onSelect} t={t} />);

    fireEvent.click(screen.getByText("templates.variables.businessAddress"));
    expect(onSelect).toHaveBeenCalledWith("{{config.businessAddress}}");

    fireEvent.click(screen.getByText("templates.variables.businessPhone"));
    expect(onSelect).toHaveBeenCalledWith("{{config.businessPhone}}");

    fireEvent.click(screen.getByText("templates.variables.businessEmail"));
    expect(onSelect).toHaveBeenCalledWith("{{config.businessEmail}}");
  });
});
