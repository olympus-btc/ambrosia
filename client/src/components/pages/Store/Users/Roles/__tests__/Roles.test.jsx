import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { Roles } from "../Roles";

let mockIsAdmin = true;

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  return { ...actual, addToast: jest.fn() };
});

jest.mock("next-intl", () => {
  const roleTranslations = (key) => key;
  return { useTranslations: () => roleTranslations };
});

jest.mock("@/hooks/usePermission", () => ({
  RequirePermission: ({ children }) => children,
}));

jest.mock("@/hooks/useNavigation", () => ({
  useNavigation: () => ({ isAdmin: mockIsAdmin }),
}));

jest.mock("@/providers/configurations/configurationsProvider", () => ({
  useConfigurations: () => ({ businessType: "store" }),
}));

jest.mock("@/components/pages/Store/hooks/usePermissions", () => ({
  usePermissions: () => ({ permissions: [], loading: false }),
}));

jest.mock("../RolesList", () => ({
  RolesList: ({ roles, canManageRoles, onEdit, onDelete }) => (
    <div>
      roles list
      {roles.map((role) => (
        <div key={role.id}>
          <span>{role.role}</span>
          {canManageRoles && (
            <>
              <button type="button" onClick={() => onEdit(role)}>
                edit role
              </button>
              <button type="button" onClick={() => onDelete(role)}>
                delete role
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("../CreateRoleModal", () => ({
  CreateRoleModal: ({ isOpen, onSubmit, form, setForm, creating, togglePermission }) => (
    isOpen ? (
      <div>
        <span>roles.create.title</span>
        <span data-testid="creating">{creating ? "yes" : "no"}</span>
        <span data-testid="role-name">{form.name}</span>
        <button type="button" onClick={() => setForm((currentForm) => ({ ...currentForm, name: "cashier" }))}>
          set role name
        </button>
        <button type="button" onClick={() => setForm((currentForm) => ({ ...currentForm, isAdmin: true }))}>
          set admin role
        </button>
        <button type="button" onClick={() => togglePermission("orders_create")}>
          toggle orders_create
        </button>
        <button type="button" onClick={() => togglePermission("products_read")}>
          toggle products_read
        </button>
        <button type="button" onClick={onSubmit}>
          roles.actions.create
        </button>
      </div>
    ) : null
  ),
}));

jest.mock("../DeleteRoleModal", () => ({
  DeleteRoleModal: ({ role, onConfirm, deleting }) => (
    role ? (
      <div>
        <span>roles.actions.deleteConfirmTitle</span>
        <span data-testid="deleting">{deleting ? "yes" : "no"}</span>
        <button type="button" onClick={onConfirm}>
          roles.actions.delete
        </button>
      </div>
    ) : null
  ),
}));

jest.mock("../EditRoleModal", () => ({
  EditRoleModal: ({ isOpen, onSubmit, form, setForm, updating }) => (
    isOpen ? (
      <div>
        <span>roles.edit.title</span>
        <span data-testid="updating">{updating ? "yes" : "no"}</span>
        <span data-testid="edit-role-name">{form.name}</span>
        <button type="button" onClick={() => setForm((currentForm) => ({ ...currentForm, name: "manager" }))}>
          set edit role name
        </button>
        <button type="button" onClick={() => setForm((currentForm) => ({ ...currentForm, isAdmin: true }))}>
          set edit admin role
        </button>
        <button type="button" onClick={onSubmit}>
          roles.actions.save
        </button>
      </div>
    ) : null
  ),
}));

const { addToast } = require("@heroui/react");

const renderRoles = (props = {}) => render(
  <Roles
    roles={[]}
    createRole={jest.fn()}
    deleteRole={jest.fn()}
    loading={false}
    updateRoleWithPermissions={jest.fn()}
    getRolePermissions={jest.fn()}
    {...props}
  />,
);

describe("Roles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAdmin = true;
  });

  it("shows a read-only notice and hides management controls for non-admin users", () => {
    mockIsAdmin = false;

    renderRoles({ roles: [{ id: "role-id", role: "cashier", isAdmin: false }] });

    expect(screen.getByText("roles.state.readOnlyTitle")).toBeInTheDocument();
    expect(screen.getByText("roles.state.readOnlyDescription")).toBeInTheDocument();
    expect(screen.queryByText("roles.actions.new")).not.toBeInTheDocument();
    expect(screen.queryByText("edit role")).not.toBeInTheDocument();
    expect(screen.queryByText("delete role")).not.toBeInTheDocument();
  });

  it("shows a success toast after creating a role", async () => {
    const createRole = jest.fn(() => Promise.resolve("role-id"));

    renderRoles({ createRole });

    fireEvent.click(screen.getByText("roles.actions.new"));
    fireEvent.click(screen.getByText("set role name"));

    await waitFor(() => expect(screen.getByTestId("role-name")).toHaveTextContent("cashier"));

    fireEvent.click(screen.getByText("roles.actions.create"));

    await waitFor(() => expect(createRole).toHaveBeenCalledWith({
      name: "cashier",
      isAdmin: false,
      permissions: [],
    }));
    expect(addToast).toHaveBeenCalledWith({
      title: "roles.actions.createSuccess",
      color: "success",
    });
    expect(screen.queryByText("roles.create.title")).not.toBeInTheDocument();
  });

  it("autocompletes the suggested permissions when orders_create is toggled on", async () => {
    const createRole = jest.fn(() => Promise.resolve("role-id"));

    renderRoles({ createRole });

    fireEvent.click(screen.getByText("roles.actions.new"));
    fireEvent.click(screen.getByText("set role name"));
    fireEvent.click(screen.getByText("toggle orders_create"));

    fireEvent.click(screen.getByText("roles.actions.create"));

    await waitFor(() => expect(createRole).toHaveBeenCalledWith({
      name: "cashier",
      isAdmin: false,
      permissions: ["orders_create", "products_read", "categories_read", "payments_read"],
    }));
  });

  it("lets the admin untoggle one suggested permission without affecting the others", async () => {
    const createRole = jest.fn(() => Promise.resolve("role-id"));

    renderRoles({ createRole });

    fireEvent.click(screen.getByText("roles.actions.new"));
    fireEvent.click(screen.getByText("set role name"));
    fireEvent.click(screen.getByText("toggle orders_create"));
    fireEvent.click(screen.getByText("toggle products_read"));

    fireEvent.click(screen.getByText("roles.actions.create"));

    await waitFor(() => expect(createRole).toHaveBeenCalledWith({
      name: "cashier",
      isAdmin: false,
      permissions: ["orders_create", "categories_read", "payments_read"],
    }));
  });

  it("shows an error toast and keeps the create modal open when role creation fails", async () => {
    const createRole = jest.fn(() => Promise.reject(new Error("create failed")));

    renderRoles({ createRole });

    fireEvent.click(screen.getByText("roles.actions.new"));
    fireEvent.click(screen.getByText("set role name"));

    await waitFor(() => expect(screen.getByTestId("role-name")).toHaveTextContent("cashier"));

    fireEvent.click(screen.getByText("roles.actions.create"));

    await waitFor(() => expect(createRole).toHaveBeenCalledWith({
      name: "cashier",
      isAdmin: false,
      permissions: [],
    }));
    expect(addToast).toHaveBeenCalledWith({
      title: "roles.actions.createErrorTitle",
      description: "roles.actions.createErrorDescription",
      color: "danger",
    });
    expect(screen.getByText("roles.create.title")).toBeInTheDocument();
  });

  it("shows duplicate role feedback when role creation conflicts", async () => {
    const createConflictError = new Error("role already exists");
    createConflictError.status = 409;
    const createRole = jest.fn(() => Promise.reject(createConflictError));

    renderRoles({ createRole });

    fireEvent.click(screen.getByText("roles.actions.new"));
    fireEvent.click(screen.getByText("set role name"));

    await waitFor(() => expect(screen.getByTestId("role-name")).toHaveTextContent("cashier"));

    fireEvent.click(screen.getByText("roles.actions.create"));

    await waitFor(() => expect(createRole).toHaveBeenCalledWith({
      name: "cashier",
      isAdmin: false,
      permissions: [],
    }));
    expect(addToast).toHaveBeenCalledWith({
      title: "roles.actions.createConflictTitle",
      description: "roles.actions.createConflictDescription",
      color: "warning",
    });
    expect(screen.getByText("roles.create.title")).toBeInTheDocument();
  });

  it("shows admin-required feedback when admin role creation is forbidden", async () => {
    const adminRequiredError = new Error("admin required");
    adminRequiredError.status = 403;
    const createRole = jest.fn(() => Promise.reject(adminRequiredError));

    renderRoles({ createRole });

    fireEvent.click(screen.getByText("roles.actions.new"));
    fireEvent.click(screen.getByText("set role name"));
    fireEvent.click(screen.getByText("set admin role"));
    fireEvent.click(screen.getByText("roles.actions.create"));

    await waitFor(() => expect(createRole).toHaveBeenCalledWith(expect.objectContaining({ isAdmin: true })));
    expect(addToast).toHaveBeenCalledWith({
      title: "roles.actions.adminRequiredTitle",
      description: "roles.actions.adminRequiredDescription",
      color: "warning",
    });
  });

  it("shows admin-required feedback when admin role promotion is forbidden", async () => {
    const adminRequiredError = new Error("admin required");
    adminRequiredError.status = 403;
    const updateRoleWithPermissions = jest.fn(() => Promise.reject(adminRequiredError));

    renderRoles({
      roles: [{ id: "role-id", role: "cashier", isAdmin: false }],
      updateRoleWithPermissions,
      getRolePermissions: jest.fn(() => Promise.resolve([])),
    });

    fireEvent.click(screen.getByText("edit role"));
    await waitFor(() => expect(screen.getByText("roles.edit.title")).toBeInTheDocument());
    fireEvent.click(screen.getByText("set edit admin role"));
    fireEvent.click(screen.getByText("roles.actions.save"));

    await waitFor(() => expect(updateRoleWithPermissions).toHaveBeenCalledWith(
      "role-id",
      expect.objectContaining({ isAdmin: true }),
    ));
    expect(addToast).toHaveBeenCalledWith({
      title: "roles.actions.adminRequiredTitle",
      description: "roles.actions.adminRequiredDescription",
      color: "warning",
    });
  });

  it("does not create a role twice while creation is pending", async () => {
    let resolveCreateRole;
    const createRole = jest.fn(() => new Promise((resolve) => {
      resolveCreateRole = resolve;
    }));

    renderRoles({ createRole });

    fireEvent.click(screen.getByText("roles.actions.new"));
    fireEvent.click(screen.getByText("set role name"));

    await waitFor(() => expect(screen.getByTestId("role-name")).toHaveTextContent("cashier"));

    fireEvent.click(screen.getByText("roles.actions.create"));
    fireEvent.click(screen.getByText("roles.actions.create"));

    await waitFor(() => expect(createRole).toHaveBeenCalledTimes(1));

    resolveCreateRole("role-id");

    await waitFor(() => expect(screen.queryByText("roles.create.title")).not.toBeInTheDocument());
  });

  it("does not update a role twice while update is pending", async () => {
    let resolveUpdateRole;
    const updateRoleWithPermissions = jest.fn(() => new Promise((resolve) => {
      resolveUpdateRole = resolve;
    }));
    const getRolePermissions = jest.fn(() => Promise.resolve([]));

    renderRoles({
      roles: [{ id: "role-id", role: "cashier", isAdmin: false }],
      updateRoleWithPermissions,
      getRolePermissions,
    });

    fireEvent.click(screen.getByText("edit role"));

    await waitFor(() => expect(screen.getByText("roles.edit.title")).toBeInTheDocument());

    fireEvent.click(screen.getByText("set edit role name"));

    await waitFor(() => expect(screen.getByTestId("edit-role-name")).toHaveTextContent("manager"));

    fireEvent.click(screen.getByText("roles.actions.save"));
    fireEvent.click(screen.getByText("roles.actions.save"));

    await waitFor(() => expect(updateRoleWithPermissions).toHaveBeenCalledTimes(1));

    resolveUpdateRole();

    await waitFor(() => expect(screen.queryByText("roles.edit.title")).not.toBeInTheDocument());
  });

  it("updates a role without sending password data", async () => {
    const updateRoleWithPermissions = jest.fn(() => Promise.resolve());
    const getRolePermissions = jest.fn(() => Promise.resolve([]));

    renderRoles({
      roles: [{ id: "role-id", role: "cashier", isAdmin: false }],
      updateRoleWithPermissions,
      getRolePermissions,
    });

    fireEvent.click(screen.getByText("edit role"));

    await waitFor(() => expect(screen.getByText("roles.edit.title")).toBeInTheDocument());

    fireEvent.click(screen.getByText("set edit role name"));
    fireEvent.click(screen.getByText("roles.actions.save"));

    await waitFor(() => expect(updateRoleWithPermissions).toHaveBeenCalledWith("role-id", {
      name: "manager",
      isAdmin: false,
      permissions: [],
    }));
  });

  it("does not delete a role twice while deletion is pending", async () => {
    let resolveDeleteRole;
    const deleteRole = jest.fn(() => new Promise((resolve) => {
      resolveDeleteRole = resolve;
    }));

    renderRoles({
      roles: [{ id: "role-id", role: "cashier", isAdmin: false }],
      deleteRole,
    });

    fireEvent.click(screen.getByText("delete role"));

    await waitFor(() => expect(screen.getByText("roles.actions.deleteConfirmTitle")).toBeInTheDocument());

    fireEvent.click(screen.getByText("roles.actions.delete"));
    fireEvent.click(screen.getByText("roles.actions.delete"));

    await waitFor(() => expect(deleteRole).toHaveBeenCalledTimes(1));

    resolveDeleteRole();

    await waitFor(() => expect(screen.queryByText("roles.actions.deleteConfirmTitle")).not.toBeInTheDocument());
  });

  it("shows delete-specific error feedback when role deletion fails", async () => {
    const deleteRole = jest.fn(() => Promise.reject(new Error("delete failed")));

    renderRoles({
      roles: [{ id: "role-id", role: "cashier", isAdmin: false }],
      deleteRole,
    });

    fireEvent.click(screen.getByText("delete role"));

    await waitFor(() => expect(screen.getByText("roles.actions.deleteConfirmTitle")).toBeInTheDocument());

    fireEvent.click(screen.getByText("roles.actions.delete"));

    await waitFor(() => expect(deleteRole).toHaveBeenCalledWith("role-id"));
    expect(addToast).toHaveBeenCalledWith({
      title: "roles.actions.saveErrorTitle",
      description: "roles.actions.deleteError",
      color: "danger",
    });
    expect(screen.getByText("roles.actions.deleteConfirmTitle")).toBeInTheDocument();
  });
});
