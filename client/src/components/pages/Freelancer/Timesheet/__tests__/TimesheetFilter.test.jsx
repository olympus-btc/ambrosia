import { fireEvent, render, screen } from "@testing-library/react";

import { TimesheetFilter } from "../TimesheetFilter";

jest.mock("next-intl", () => ({
  useTranslations: () => (key, values) => (values?.count ? `${key}:${values.count}` : key),
}));

jest.mock("@heroui/react", () => {
  const React = jest.requireActual("react");
  return {
    Popover: ({ children }) => <div>{children}</div>,
    PopoverTrigger: ({ children }) => children,
    PopoverContent: ({ children }) => <div>{children}</div>,
    Button: ({ children, onPress, startContent, endContent, ...buttonProps }) => (
      <button type="button" onClick={onPress} aria-expanded={buttonProps["aria-expanded"]}>
        {startContent}
        {children}
        {endContent}
      </button>
    ),
    Select: ({ label, selectedKeys, onSelectionChange, children }) => (
      <label>
        {label}
        <select
          aria-label={label}
          value={selectedKeys[0]}
          onChange={(changeEvent) => onSelectionChange(new Set([changeEvent.target.value]))}
        >
          {React.Children.map(children, (child) => (
            <option value={child.key.replace(/^\.\$/, "")}>{child.props.children}</option>
          ))}
        </select>
      </label>
    ),
    SelectItem: ({ children }) => children,
  };
});

const clients = [
  { id: "acme-id", name: "Acme" },
  { id: "globex-id", name: "Globex" },
];
const projects = [
  { id: "website-id", clientId: "acme-id", name: "Website" },
  { id: "mobile-app-id", clientId: "globex-id", name: "Mobile App" },
];

function renderTimesheetFilter(filters = { clientId: "", projectId: "" }) {
  const onFiltersChange = jest.fn();
  render(<TimesheetFilter filters={filters} clients={clients} projects={projects} onFiltersChange={onFiltersChange} />);
  return { onFiltersChange };
}

function optionLabelsOf(selectLabel) {
  return Array.from(screen.getByLabelText(selectLabel).querySelectorAll("option")).map((option) => option.textContent);
}

describe("TimesheetFilter", () => {
  it("shows the plain title when no filter is active", () => {
    renderTimesheetFilter();

    expect(screen.getByRole("button", { name: "filters.title" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "filters.clear" })).not.toBeInTheDocument();
  });

  it("shows how many filters are active", () => {
    renderTimesheetFilter({ clientId: "acme-id", projectId: "website-id" });

    expect(screen.getByRole("button", { name: "filters.activeTitle:2" })).toBeInTheDocument();
  });

  it("filters by client", () => {
    const { onFiltersChange } = renderTimesheetFilter();

    fireEvent.change(screen.getByLabelText("filters.clientLabel"), { target: { value: "acme-id" } });

    expect(onFiltersChange).toHaveBeenLastCalledWith({ clientId: "acme-id", projectId: "" });
  });

  it("filters by project", () => {
    const { onFiltersChange } = renderTimesheetFilter();

    fireEvent.change(screen.getByLabelText("filters.projectLabel"), { target: { value: "website-id" } });

    expect(onFiltersChange).toHaveBeenLastCalledWith({ clientId: "", projectId: "website-id" });
  });

  it("only lists the projects of the selected client", () => {
    renderTimesheetFilter({ clientId: "acme-id", projectId: "" });

    expect(optionLabelsOf("filters.projectLabel")).toEqual(["filters.allProjects", "Website"]);
  });

  it("drops the selected project when it belongs to another client", () => {
    const { onFiltersChange } = renderTimesheetFilter({ clientId: "", projectId: "website-id" });

    fireEvent.change(screen.getByLabelText("filters.clientLabel"), { target: { value: "globex-id" } });

    expect(onFiltersChange).toHaveBeenLastCalledWith({ clientId: "globex-id", projectId: "" });
  });

  it("keeps the selected project when it belongs to the selected client", () => {
    const { onFiltersChange } = renderTimesheetFilter({ clientId: "", projectId: "website-id" });

    fireEvent.change(screen.getByLabelText("filters.clientLabel"), { target: { value: "acme-id" } });

    expect(onFiltersChange).toHaveBeenLastCalledWith({ clientId: "acme-id", projectId: "website-id" });
  });

  it("removes a filter when all options are selected again", () => {
    const { onFiltersChange } = renderTimesheetFilter({ clientId: "", projectId: "website-id" });

    fireEvent.change(screen.getByLabelText("filters.projectLabel"), { target: { value: "__all__" } });

    expect(onFiltersChange).toHaveBeenLastCalledWith({ clientId: "", projectId: "" });
  });

  it("clears every filter", () => {
    const { onFiltersChange } = renderTimesheetFilter({ clientId: "acme-id", projectId: "website-id" });

    fireEvent.click(screen.getByRole("button", { name: "filters.clear" }));

    expect(onFiltersChange).toHaveBeenLastCalledWith({ clientId: "", projectId: "" });
  });
});
