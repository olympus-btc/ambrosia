import { render, screen, fireEvent } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { RolesTable } from "../RolesTable";

jest.mock("@/hooks/usePermission", () => ({
  RequirePermission: ({ children }) => <>{children}</>,
  usePermission: () => true,
}));

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const roles = [
  { id: "1", role: "cashier", isAdmin: false },
  { id: "2", role: "Custom Role", isAdmin: false },
  { id: "3", role: "admin", isAdmin: true },
];

const renderTable = (props = {}) => render(
  <I18nProvider>
    <RolesTable
      roles={roles}
      loading={false}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
      {...props}
    />
  </I18nProvider>,
);

describe("RolesTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading state", () => {
    renderTable({ loading: true });
    expect(screen.getByText("roles.state.loading")).toBeInTheDocument();
  });

  it("shows empty state when no roles", () => {
    renderTable({ roles: [] });
    expect(screen.getByText("roles.state.empty")).toBeInTheDocument();
  });

  it("renders all roles", () => {
    renderTable();
    expect(screen.getByText("roles.templates.cashier.name")).toBeInTheDocument();
    expect(screen.getByText("Custom Role")).toBeInTheDocument();
    expect(screen.getByText("roles.templates.admin.name")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    renderTable();
    expect(screen.getByText("roles.columns.name")).toBeInTheDocument();
    expect(screen.getByText("roles.columns.description")).toBeInTheDocument();
    expect(screen.getByText("roles.columns.type")).toBeInTheDocument();
    expect(screen.getByText("roles.columns.actions")).toBeInTheDocument();
  });

  it("shows admin chip for admin roles and standard chip for others", () => {
    renderTable();
    expect(screen.getByText("roles.labels.adminChip")).toBeInTheDocument();
    expect(screen.getAllByText("roles.labels.standardChip")).toHaveLength(2);
  });

  it("shows admin/standard label text per role", () => {
    renderTable();
    expect(screen.getByText("roles.labels.admin")).toBeInTheDocument();
    expect(screen.getAllByText("roles.labels.standard")).toHaveLength(2);
  });

  it("calls onEdit with the correct role when edit is pressed", () => {
    const onEdit = jest.fn();
    renderTable({ onEdit });
    const editButtons = screen.getAllByRole("button", { name: "Edit Role" });
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(roles[0]);
  });

  it("calls onDelete with the correct role when delete is pressed", () => {
    const onDelete = jest.fn();
    renderTable({ onDelete });
    const deleteButtons = screen.getAllByRole("button", { name: "Delete Role" });
    fireEvent.click(deleteButtons[1]);
    expect(onDelete).toHaveBeenCalledWith(roles[1]);
  });
});
