import { render, screen, fireEvent } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { CreateRoleModal } from "../CreateRoleModal";

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const baseForm = {
  name: "",
  password: "",
  isAdmin: false,
  permissions: [],
};

const t = (key) => key;

const renderModal = (props = {}) => render(
  <I18nProvider>
    <CreateRoleModal
      isOpen
      onClose={jest.fn()}
      onSubmit={jest.fn()}
      form={baseForm}
      setForm={jest.fn()}
      permissionOptions={[]}
      togglePermission={jest.fn()}
      creating={false}
      t={t}
      businessType="store"
      {...props}
    />
  </I18nProvider>,
);

describe("CreateRoleModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders template selection view by default", () => {
    renderModal();
    expect(screen.getByText("roles.create.title")).toBeInTheDocument();
    expect(screen.getByText("roles.create.templateLegend")).toBeInTheDocument();
    expect(screen.getByText("roles.templates.cashier.name")).toBeInTheDocument();
    expect(screen.getByText("roles.templates.manager.name")).toBeInTheDocument();
    expect(screen.getByText("roles.templates.admin.name")).toBeInTheDocument();
  });

  it("renders restaurant templates when businessType is restaurant", () => {
    renderModal({ businessType: "restaurant" });
    expect(screen.getByText("roles.templates.waiter.name")).toBeInTheDocument();
    expect(screen.getByText("roles.templates.supervisor.name")).toBeInTheDocument();
  });

  it("shows advanced form when advanced button is clicked", () => {
    renderModal();
    fireEvent.click(screen.getByText("roles.create.advanced"));
    expect(screen.getByLabelText("roles.create.roleName")).toBeInTheDocument();
    expect(screen.getByLabelText("roles.create.password")).toBeInTheDocument();
    expect(screen.getByText("roles.create.isAdmin")).toBeInTheDocument();
  });

  it("goes back to template view from advanced", () => {
    renderModal();
    fireEvent.click(screen.getByText("roles.create.advanced"));
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByText("roles.create.templateLegend")).toBeInTheDocument();
  });

  it("selects template and populates form", () => {
    const setForm = jest.fn((updater) => updater(baseForm));
    renderModal({ setForm });
    fireEvent.click(screen.getByText("roles.templates.cashier.name"));
    expect(setForm).toHaveBeenCalled();
    const result = setForm.mock.results[0].value;
    expect(result.name).toBe("cashier");
    expect(result.isAdmin).toBe(false);
    expect(result.permissions).toContain("products_read");
  });

  it("selects admin template and sets isAdmin true", () => {
    const setForm = jest.fn((updater) => updater(baseForm));
    renderModal({ setForm });
    fireEvent.click(screen.getByText("roles.templates.admin.name"));
    const result = setForm.mock.results[0].value;
    expect(result.name).toBe("admin");
    expect(result.isAdmin).toBe(true);
  });

  it("submit button is disabled when form name is empty", () => {
    renderModal({ form: { ...baseForm, name: "" } });
    fireEvent.click(screen.getByText("roles.create.advanced"));
    const submitBtn = screen.getByText("roles.actions.create").closest("button");
    expect(submitBtn).toBeDisabled();
  });

  it("submit button is enabled when form has a name", () => {
    renderModal({ form: { ...baseForm, name: "cashier" } });
    fireEvent.click(screen.getByText("roles.create.advanced"));
    expect(screen.getByText("roles.actions.create").closest("button")).not.toBeDisabled();
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText("roles.actions.cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onSubmit when create button is clicked with valid name", () => {
    const onSubmit = jest.fn();
    renderModal({ onSubmit, form: { ...baseForm, name: "cashier" } });
    fireEvent.click(screen.getByText("roles.create.advanced"));
    fireEvent.click(screen.getByText("roles.actions.create"));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("shows spinner when creating", () => {
    renderModal({ creating: true, form: { ...baseForm, name: "cashier" } });
    fireEvent.click(screen.getByText("roles.create.advanced"));
    expect(screen.queryByText("roles.actions.create")).not.toBeInTheDocument();
  });

  it("resolves template key to translated name in advanced name input", () => {
    renderModal({ form: { ...baseForm, name: "cashier" } });
    fireEvent.click(screen.getByText("roles.create.advanced"));
    const nameInput = screen.getByLabelText("roles.create.roleName");
    expect(nameInput).toHaveValue("roles.templates.cashier.name");
  });

  it("shows raw name for non-template roles in advanced name input", () => {
    renderModal({ form: { ...baseForm, name: "My Custom Role" } });
    fireEvent.click(screen.getByText("roles.create.advanced"));
    const nameInput = screen.getByLabelText("roles.create.roleName");
    expect(nameInput).toHaveValue("My Custom Role");
  });
});
