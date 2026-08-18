import { render, screen, fireEvent } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { EditRoleModal } from "../EditRoleModal";

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const baseForm = {
  name: "cashier",
  isAdmin: false,
  permissions: ["products_read", "orders_read"],
};

const renderModal = (props = {}) => render(
  <I18nProvider>
    <EditRoleModal
      isOpen
      onClose={jest.fn()}
      onSubmit={jest.fn()}
      form={baseForm}
      setForm={jest.fn()}
      permissionOptions={[]}
      togglePermission={jest.fn()}
      updating={false}
      roleName="cashier"
      businessType="store"
      {...props}
    />
  </I18nProvider>,
);

describe("EditRoleModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders title with role name", () => {
    renderModal();
    expect(screen.getByText(/roles.edit.title/)).toBeInTheDocument();
    expect(screen.getByText(/cashier/)).toBeInTheDocument();
  });

  it("renders form fields with current values", () => {
    renderModal();
    expect(screen.getByLabelText("roles.edit.roleName")).toHaveValue("cashier");
    expect(screen.getByText("roles.edit.isAdmin")).toBeInTheDocument();
  });

  it("does not render a password field", () => {
    renderModal();
    expect(screen.queryByLabelText("roles.edit.password")).not.toBeInTheDocument();
  });

  it("updates name field on change", () => {
    const setForm = jest.fn((updater) => updater(baseForm));
    renderModal({ setForm });
    fireEvent.change(screen.getByLabelText("roles.edit.roleName"), { target: { value: "supervisor" } });
    expect(setForm).toHaveBeenCalled();
    const result = setForm.mock.results[0].value;
    expect(result.name).toBe("supervisor");
  });

  it("clears inherited permissions when admin privileges are removed", () => {
    const adminForm = { ...baseForm, isAdmin: true };
    const setForm = jest.fn((updater) => updater(adminForm));
    renderModal({ form: adminForm, setForm });

    fireEvent.click(screen.getByText("roles.edit.isAdmin"));

    expect(setForm).toHaveBeenCalled();
    expect(setForm.mock.results[0].value).toEqual({
      ...adminForm,
      isAdmin: false,
      permissions: [],
    });
  });

  it("save button is disabled when name is empty", () => {
    renderModal({ form: { ...baseForm, name: "" } });
    const saveBtn = screen.getByText("roles.actions.save").closest("button");
    expect(saveBtn).toBeDisabled();
  });

  it("save button is enabled when name is present", () => {
    renderModal();
    const saveBtn = screen.getByText("roles.actions.save").closest("button");
    expect(saveBtn).not.toBeDisabled();
  });

  it("calls onSubmit when save button is clicked", () => {
    const onSubmit = jest.fn();
    renderModal({ onSubmit });
    fireEvent.click(screen.getByText("roles.actions.save"));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText("roles.actions.cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("disables action buttons when updating", () => {
    renderModal({ updating: true });
    expect(screen.getByText("roles.actions.save").closest("button")).toBeDisabled();
    expect(screen.getByText("roles.actions.cancel").closest("button")).toBeDisabled();
  });
});
