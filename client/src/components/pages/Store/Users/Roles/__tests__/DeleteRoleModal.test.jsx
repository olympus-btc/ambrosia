import { render, screen, fireEvent } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { DeleteRoleModal } from "../DeleteRoleModal";

const localStorageMock = { getItem: jest.fn(), setItem: jest.fn(), clear: jest.fn() };
global.localStorage = localStorageMock;

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const role = { id: "1", role: "cashier", isAdmin: false };

const renderModal = (props = {}) => render(
  <I18nProvider>
    <DeleteRoleModal
      role={role}
      onClose={jest.fn()}
      onConfirm={jest.fn()}
      deleting={false}
      {...props}
    />
  </I18nProvider>,
);

describe("DeleteRoleModal", () => {
  it("renders when role is provided", () => {
    renderModal();
    expect(screen.getByText("roles.actions.deleteConfirmTitle")).toBeInTheDocument();
  });

  it("does not render when role is null", () => {
    renderModal({ role: null });
    expect(screen.queryByText("roles.actions.deleteConfirmTitle")).not.toBeInTheDocument();
  });

  it("shows the confirm body text", () => {
    renderModal();
    expect(screen.getByText(/roles.actions.deleteConfirmBody/)).toBeInTheDocument();
  });

  it("calls onClose when cancel is pressed", () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText("roles.actions.cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onConfirm when delete is pressed", () => {
    const onConfirm = jest.fn();
    renderModal({ onConfirm });
    fireEvent.click(screen.getByText("roles.actions.delete"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("disables cancel button while deleting", () => {
    renderModal({ deleting: true });
    expect(screen.getByText("roles.actions.cancel").closest("button")).toBeDisabled();
  });
});
