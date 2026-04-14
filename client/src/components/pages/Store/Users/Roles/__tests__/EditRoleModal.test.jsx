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
  password: "",
  isAdmin: false,
  permissions: ["products_read", "orders_read"],
};

const t = (key) => key;

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
      t={t}
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
    expect(screen.getByLabelText("roles.edit.password")).toBeInTheDocument();
    expect(screen.getByText("roles.edit.isAdmin")).toBeInTheDocument();
  });

  it("updates name field on change", () => {
    const setForm = jest.fn((updater) => updater(baseForm));
    renderModal({ setForm });
    fireEvent.change(screen.getByLabelText("roles.edit.roleName"), { target: { value: "supervisor" } });
    expect(setForm).toHaveBeenCalled();
    const result = setForm.mock.results[0].value;
    expect(result.name).toBe("supervisor");
  });

  it("updates password field on change", () => {
    const setForm = jest.fn((updater) => updater(baseForm));
    renderModal({ setForm });
    fireEvent.change(screen.getByLabelText("roles.edit.password"), { target: { value: "secret" } });
    expect(setForm).toHaveBeenCalled();
    const result = setForm.mock.results[0].value;
    expect(result.password).toBe("secret");
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

  it("shows spinner when updating", () => {
    renderModal({ updating: true });
    expect(screen.queryByText("roles.actions.save")).not.toBeInTheDocument();
  });
});
