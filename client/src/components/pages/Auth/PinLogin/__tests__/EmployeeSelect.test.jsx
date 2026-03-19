import { render, screen } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { EmployeeSelect } from "../EmployeeSelect";

const employees = [
  { id: "1", name: "Alice", role: "cashier", avatar: "Al" },
  { id: "2", name: "Bob", role: "manager", avatar: "Bo" },
];

const renderSelect = (props = {}) => render(
  <I18nProvider>
    <EmployeeSelect
      employees={employees}
      selectedUser=""
      onSelect={jest.fn()}
      {...props}
    />
  </I18nProvider>,
);

describe("EmployeeSelect", () => {
  it("renders the select label", () => {
    renderSelect();
    expect(screen.getByText("selectLabel")).toBeInTheDocument();
  });

  it("renders all employee options", () => {
    renderSelect();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows no-employees message when list is empty", () => {
    renderSelect({ employees: [] });
    expect(screen.getByText("noEmployees")).toBeInTheDocument();
  });
});
