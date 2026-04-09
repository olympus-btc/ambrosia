import { render, screen, fireEvent } from "@testing-library/react";

import { RolesList } from "../RolesList";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
}));

jest.mock("../RolesCard", () => ({
  RolesCard: ({ role, onEdit, onDelete }) => (
    <div>
      <span>{role.role}</span>
      <button aria-label="Edit Role" onClick={() => onEdit(role)}>edit</button>
      <button aria-label="Delete Role" onClick={() => onDelete(role)}>delete</button>
    </div>
  ),
}));

jest.mock("../RolesTable", () => ({
  RolesTable: ({ roles, onEdit, onDelete }) => (
    <table>
      <tbody>
        {roles.map((role) => (
          <tr key={role.id}>
            <td>{role.role}</td>
            <td><button aria-label="Edit Role" onClick={() => onEdit(role)}>edit</button></td>
            <td><button aria-label="Delete Role" onClick={() => onDelete(role)}>delete</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const roles = [
  { id: "1", role: "cashier", isAdmin: false },
  { id: "2", role: "admin", isAdmin: true },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("RolesList", () => {
  it("shows loading state", () => {
    render(<RolesList roles={[]} loading onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText("roles.state.loading")).toBeInTheDocument();
  });

  it("shows empty state when no roles", () => {
    render(<RolesList roles={[]} loading={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText("roles.state.empty")).toBeInTheDocument();
  });

  it("renders all roles", () => {
    render(<RolesList roles={roles} loading={false} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getAllByText("cashier")).toHaveLength(2);
    expect(screen.getAllByText("admin")).toHaveLength(2);
  });

  it("calls onEdit when edit is pressed", () => {
    const onEdit = jest.fn();
    render(<RolesList roles={roles} loading={false} onEdit={onEdit} onDelete={jest.fn()} />);
    fireEvent.click(screen.getAllByLabelText("Edit Role")[0]);
    expect(onEdit).toHaveBeenCalledWith(roles[0]);
  });

  it("calls onDelete when delete is pressed", () => {
    const onDelete = jest.fn();
    render(<RolesList roles={roles} loading={false} onEdit={jest.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getAllByLabelText("Delete Role")[0]);
    expect(onDelete).toHaveBeenCalledWith(roles[0]);
  });
});
