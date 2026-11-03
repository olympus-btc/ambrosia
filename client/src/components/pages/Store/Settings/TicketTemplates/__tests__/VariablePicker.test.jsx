import { fireEvent, render, screen } from "@testing-library/react";

import { TemplateVariablePicker } from "../VariablePicker";

jest.mock("@heroui/react", () => ({
  Button: ({ onPress, children, "aria-label": ariaLabel, isIconOnly, ...props }) => (
    <button type="button" onClick={onPress} aria-label={ariaLabel} {...props}>
      {children}
    </button>
  ),
  Chip: ({ onClick, children, startContent, "aria-pressed": ariaPressed }) => (
    <button type="button" onClick={onClick} aria-pressed={ariaPressed}>
      {startContent}
      {children}
    </button>
  ),
  Popover: ({ children }) => <div>{children}</div>,
  PopoverTrigger: ({ children }) => <div>{children}</div>,
  PopoverContent: ({ children }) => <div>{children}</div>,
}));

jest.mock("lucide-react", () => ({
  Braces: () => <svg data-testid="braces-icon" />,
  Check: () => <svg data-testid="check-icon" />,
}));

const settingsTranslations = (key) => key;

describe("TemplateVariablePicker", () => {
  it("renders the trigger button", () => {
    render(<TemplateVariablePicker onSelect={jest.fn()} settingsTranslations={settingsTranslations} />);
    expect(screen.getByRole("button", { name: "templates.variables.title" })).toBeInTheDocument();
  });

  it("renders config variable chips", () => {
    render(<TemplateVariablePicker onSelect={jest.fn()} settingsTranslations={settingsTranslations} />);
    expect(screen.getByText("templates.variables.businessName")).toBeInTheDocument();
    expect(screen.getByText("templates.variables.businessAddress")).toBeInTheDocument();
    expect(screen.getByText("templates.variables.businessPhone")).toBeInTheDocument();
    expect(screen.getByText("templates.variables.businessEmail")).toBeInTheDocument();
  });

  it("renders a heading for each variable section", () => {
    render(<TemplateVariablePicker onSelect={jest.fn()} settingsTranslations={settingsTranslations} />);
    expect(screen.getByText("templates.variables.groups.config")).toBeInTheDocument();
    expect(screen.getByText("templates.variables.groups.print")).toBeInTheDocument();
  });

  it("inserts the print date and time variables", () => {
    const onSelect = jest.fn();
    render(<TemplateVariablePicker onSelect={onSelect} settingsTranslations={settingsTranslations} />);

    fireEvent.click(screen.getByText("templates.variables.printDate"));
    expect(onSelect).toHaveBeenCalledWith("{{print.date}}");

    fireEvent.click(screen.getByText("templates.variables.printTime"));
    expect(onSelect).toHaveBeenCalledWith("{{print.time}}");

    fireEvent.click(screen.getByText("templates.variables.printDateTime"));
    expect(onSelect).toHaveBeenCalledWith("{{print.dateTime}}");
  });

  it("marks the chips whose variable is already in the value", () => {
    render(
      <TemplateVariablePicker
        templateText="Printed: {{print.dateTime}}"
        onSelect={jest.fn()}
        onDeselect={jest.fn()}
        settingsTranslations={settingsTranslations}
      />,
    );
    expect(screen.getByRole("button", { name: "templates.variables.printDateTime" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "templates.variables.printDate" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByTestId("check-icon")).toHaveLength(1);
  });

  it("deselects a chip whose variable is already in the value", () => {
    const onSelect = jest.fn();
    const onDeselect = jest.fn();
    render(
      <TemplateVariablePicker
        templateText="{{print.date}}"
        onSelect={onSelect}
        onDeselect={onDeselect}
        settingsTranslations={settingsTranslations}
      />,
    );
    fireEvent.click(screen.getByText("templates.variables.printDate"));
    expect(onDeselect).toHaveBeenCalledWith("{{print.date}}");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not render ticket group chips", () => {
    render(<TemplateVariablePicker onSelect={jest.fn()} settingsTranslations={settingsTranslations} />);
    expect(screen.queryByText("templates.variables.ticketId")).not.toBeInTheDocument();
    expect(screen.queryByText("templates.variables.tableName")).not.toBeInTheDocument();
    expect(screen.queryByText("templates.variables.total")).not.toBeInTheDocument();
  });

  it("calls onSelect with the correct variable key when a chip is clicked", () => {
    const onSelect = jest.fn();
    render(<TemplateVariablePicker onSelect={onSelect} settingsTranslations={settingsTranslations} />);
    fireEvent.click(screen.getByText("templates.variables.businessName"));
    expect(onSelect).toHaveBeenCalledWith("{{config.businessName}}");
  });

  it("calls onSelect with the correct key for each config variable", () => {
    const onSelect = jest.fn();
    render(<TemplateVariablePicker onSelect={onSelect} settingsTranslations={settingsTranslations} />);

    fireEvent.click(screen.getByText("templates.variables.businessAddress"));
    expect(onSelect).toHaveBeenCalledWith("{{config.businessAddress}}");

    fireEvent.click(screen.getByText("templates.variables.businessPhone"));
    expect(onSelect).toHaveBeenCalledWith("{{config.businessPhone}}");

    fireEvent.click(screen.getByText("templates.variables.businessEmail"));
    expect(onSelect).toHaveBeenCalledWith("{{config.businessEmail}}");
  });

  it("offers the shift variables only for Z report templates", () => {
    const { rerender } = render(
      <TemplateVariablePicker onSelect={jest.fn()} ticketType="RECEIPT" settingsTranslations={settingsTranslations} />,
    );
    expect(screen.queryByText("templates.variables.groups.shift")).not.toBeInTheDocument();

    rerender(<TemplateVariablePicker onSelect={jest.fn()} ticketType="SHIFT_CLOSE" settingsTranslations={settingsTranslations} />);
    expect(screen.getByText("templates.variables.groups.shift")).toBeInTheDocument();
    expect(screen.getByText("templates.variables.expectedCash")).toBeInTheDocument();
  });
});
