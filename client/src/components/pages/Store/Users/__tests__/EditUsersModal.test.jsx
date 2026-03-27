import { render, screen, fireEvent } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { EditUsersModal } from "../EditUsersModal";

jest.mock("framer-motion", () => {
  const React = require("react");
  const Mock = React.forwardRef(({ children, ...props }, ref) => (
    <div ref={ref} {...props}>{children}</div>
  ));

  Mock.displayName = "MotionDiv";

  return {
    __esModule: true,
    AnimatePresence: ({ children }) => children,
    LazyMotion: ({ children }) => children,
    domAnimation: {},
    motion: new Proxy({}, { get: () => Mock }),
    m: new Proxy({}, { get: () => Mock }),
  };
});

const roles = [
  { id: "seller", role: "Seller" },
  { id: "admin", role: "Admin" },
];

const baseData = {
  userId: 7,
  userName: "Jane Doe",
  userPin: "4321",
  userPhone: "0987654321",
  userEmail: "jane@test.com",
  userRole: "admin",
};

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const renderModal = (props = {}) => render(
  <I18nProvider>
    <EditUsersModal
      data={baseData}
      setData={jest.fn()}
      roles={roles}
      onChange={jest.fn()}
      updateUser={jest.fn()}
      editUsersShowModal
      setEditUsersShowModal={jest.fn()}
      {...props}
    />
  </I18nProvider>,
);

describe("EditUsersModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders user data and translations", () => {
    renderModal();

    expect(screen.getByText("users.modal.titleEdit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0987654321")).toBeInTheDocument();
    expect(screen.getByLabelText("users.modal.userPinLabel")).toBeInTheDocument();
  });

  it("closes and resets data on cancel", () => {
    const setData = jest.fn();
    const setEditUsersShowModal = jest.fn();

    renderModal({ setData, setEditUsersShowModal });

    fireEvent.click(screen.getByText("users.modal.cancelButton"));

    expect(setData).toHaveBeenCalledWith({
      userId: "",
      userName: "",
      userPin: "",
      userPhone: "",
      userEmail: "",
      userRole: roles[0].id,
    });
    expect(setEditUsersShowModal).toHaveBeenCalledWith(false);
  });

  it("saves changes and closes on submit", () => {
    const setData = jest.fn();
    const setEditUsersShowModal = jest.fn();
    const updateUser = jest.fn();

    renderModal({ setData, setEditUsersShowModal, updateUser });

    fireEvent.click(screen.getByText("users.modal.editButton"));

    expect(updateUser).toHaveBeenCalledWith(baseData);
    expect(setData).toHaveBeenCalledWith({
      userId: "",
      userName: "",
      userPin: "",
      userPhone: "",
      userEmail: "",
      userRole: "Vendedor",
    });
    expect(setEditUsersShowModal).toHaveBeenCalledWith(false);
  });

  it("normalizes phone and pin to digits and toggles pin visibility", () => {
    const onChange = jest.fn();

    renderModal({ onChange });

    fireEvent.change(screen.getByLabelText("users.modal.userPhoneLabel"), { target: { value: "55-6a" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseData, userPhone: "556" });

    fireEvent.change(screen.getByLabelText("users.modal.userPinLabel"), { target: { value: "9x8y" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseData, userPin: "98" });

    const pinInput = screen.getByLabelText("users.modal.userPinLabel");
    expect(pinInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show PIN" }));
    expect(pinInput).toHaveAttribute("type", "text");
  });

  it("updates name, email, and role values", () => {
    const onChange = jest.fn();
    renderModal({ onChange });

    fireEvent.change(screen.getByLabelText("users.modal.userNameLabel"), { target: { value: "Updated Name" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseData, userName: "Updated Name" });

    fireEvent.change(screen.getByLabelText("users.modal.userEmailLabel"), { target: { value: "updated@test.com" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseData, userEmail: "updated@test.com" });

    const roleSelect = screen.getAllByLabelText("users.modal.userRoleLabel")[0];
    fireEvent.change(roleSelect, { target: { value: "seller" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseData, userRole: "seller" });
  });

  it("renders empty values when data fields are null", () => {
    renderModal({
      data: {
        userId: 1,
        userName: null,
        userPin: null,
        userPhone: null,
        userEmail: null,
        userRole: "",
      },
      roles: [],
    });

    expect(screen.getByLabelText("users.modal.userNameLabel")).toHaveValue("");
    expect(screen.getByLabelText("users.modal.userEmailLabel")).toHaveValue("");
    expect(screen.getByLabelText("users.modal.userPhoneLabel")).toHaveValue("");
    expect(screen.getByLabelText("users.modal.userPinLabel")).toHaveValue("");
    const roleSelect = screen.getAllByLabelText("users.modal.userRoleLabel")[0];
    expect(roleSelect).toHaveValue("");
  });

  it("pin is optional but enforces min length when provided", () => {
    renderModal();

    const pinInput = screen.getByLabelText("users.modal.userPinLabel");
    expect(pinInput).toHaveAttribute("minlength", "4");
    expect(pinInput).not.toHaveAttribute("required");
    expect(screen.getByLabelText("users.modal.userNameLabel")).not.toHaveAttribute("required");
  });

  it("resets role to empty when no roles are available", () => {
    const setData = jest.fn();
    const setEditUsersShowModal = jest.fn();

    renderModal({ roles: [], setData, setEditUsersShowModal });

    fireEvent.click(screen.getByText("users.modal.cancelButton"));

    expect(setData).toHaveBeenCalledWith({
      userId: "",
      userName: "",
      userPin: "",
      userPhone: "",
      userEmail: "",
      userRole: "",
    });
    expect(setEditUsersShowModal).toHaveBeenCalledWith(false);
  });
});
