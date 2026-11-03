import { fireEvent, render, screen, within } from "@testing-library/react";

import { ReportProjectsFilters } from "../ReportProjectsFilters";

jest.mock("@heroui/react", () => ({
  Input: ({ label, value, onChange, onClear, isDisabled }) => (
    <div>
      <input aria-label={label} value={value} disabled={isDisabled} onChange={onChange} />
      <button type="button" onClick={onClear}>{`clear-${label}`}</button>
    </div>
  ),
  Select: ({ label, children, onSelectionChange, isDisabled }) => (
    <select aria-label={label} disabled={isDisabled} onChange={(changeEvent) => onSelectionChange(new Set([changeEvent.target.value]))}>
      {children}
    </select>
  ),
  SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
}));

jest.mock("next-intl", () => ({ useTranslations: () => (translationKey) => translationKey }));

const clients = [{ id: "client-alice", name: "Alice" }, { id: "client-bob", name: "Bob" }];
const projects = [
  { id: "project-alice", name: "Alice Website", clientId: "client-alice" },
  { id: "project-bob", name: "Bob App", clientId: "client-bob" },
];

function renderReportProjectsFilters(reportFilters = {}) {
  const onReportFiltersChange = jest.fn();
  render(
    <ReportProjectsFilters
      reportFilters={{ search: "", clientId: "", projectId: "", ...reportFilters }}
      clients={clients}
      projects={projects}
      onReportFiltersChange={onReportFiltersChange}
    />,
  );
  return onReportFiltersChange;
}

describe("ReportProjectsFilters", () => {
  it("updates and clears the search", () => {
    const onReportFiltersChange = renderReportProjectsFilters({ search: "rev" });

    fireEvent.change(screen.getByRole("textbox", { name: "filters.search" }), { target: { value: "review" } });
    fireEvent.click(screen.getByRole("button", { name: "clear-filters.search" }));

    expect(onReportFiltersChange).toHaveBeenNthCalledWith(1, { search: "review" });
    expect(onReportFiltersChange).toHaveBeenNthCalledWith(2, { search: "" });
  });

  it("selects a project and goes back to all projects", () => {
    const onReportFiltersChange = renderReportProjectsFilters();
    const projectSelect = screen.getByRole("combobox", { name: "filters.project" });

    fireEvent.change(projectSelect, { target: { value: "project-bob" } });
    fireEvent.change(projectSelect, { target: { value: "all" } });

    expect(onReportFiltersChange).toHaveBeenNthCalledWith(1, { projectId: "project-bob" });
    expect(onReportFiltersChange).toHaveBeenNthCalledWith(2, { projectId: "" });
  });

  it("only offers the projects of the selected client", () => {
    renderReportProjectsFilters({ clientId: "client-alice" });

    const projectSelect = screen.getByRole("combobox", { name: "filters.project" });
    expect(within(projectSelect).getByRole("option", { name: "Alice Website" })).toBeInTheDocument();
    expect(within(projectSelect).queryByRole("option", { name: "Bob App" })).not.toBeInTheDocument();
  });

  it("clears the selected project when the client changes to one that does not own it", () => {
    const onReportFiltersChange = renderReportProjectsFilters({ projectId: "project-alice" });

    fireEvent.change(screen.getByRole("combobox", { name: "filters.client" }), { target: { value: "client-bob" } });

    expect(onReportFiltersChange).toHaveBeenCalledWith({ clientId: "client-bob", projectId: "" });
  });

  it("keeps the selected project when its own client is selected", () => {
    const onReportFiltersChange = renderReportProjectsFilters({ projectId: "project-alice" });

    fireEvent.change(screen.getByRole("combobox", { name: "filters.client" }), { target: { value: "client-alice" } });

    expect(onReportFiltersChange).toHaveBeenCalledWith({ clientId: "client-alice", projectId: "project-alice" });
  });
});
