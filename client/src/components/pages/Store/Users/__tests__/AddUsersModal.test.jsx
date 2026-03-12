import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import { AddUsersModal } from "../AddUsersModal";

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
  userName: "John Doe",
  userPin: "1234",
  userPhone: "1234567890",
  userEmail: "john@test.com",
  userRole: "seller",
};

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const renderModal = (props = {}) => render(
  <I18nProvider>
    <AddUsersModal
      data={baseData}
      setData={jest.fn()}
      roles={roles}
      addUser={jest.fn()}
      onChange={jest.fn()}
      addUsersShowModal
      setAddUsersShowModal={jest.fn()}
      {...props}
    />
  </I18nProvider>,
);

describe("AddUsersModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders modal and basic fields", () => {
    renderModal();

    expect(screen.getByText("users.modal.titleAdd")).toBeInTheDocument();
    expect(screen.getByLabelText("users.modal.userNameLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("users.modal.userEmailLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("users.modal.userPhoneLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("users.modal.userPinLabel")).toBeInTheDocument();
  });

  it("normalizes phone and pin to digits on change", () => {
    const onChange = jest.fn();
    renderModal({ onChange });

    fireEvent.change(screen.getByLabelText("users.modal.userPhoneLabel"), { target: { value: "123-45a" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseData, userPhone: "12345a".replace(/\D/g, "") });

    fireEvent.change(screen.getByLabelText("users.modal.userPinLabel"), { target: { value: "9x8y" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseData, userPin: "98" });
  });

  it("updates name, email, and role values", () => {
    const onChange = jest.fn();
    renderModal({ onChange });

    fireEvent.change(screen.getByLabelText("users.modal.userNameLabel"), { target: { value: "Maria" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseData, userName: "Maria" });

    fireEvent.change(screen.getByLabelText("users.modal.userEmailLabel"), { target: { value: "maria@test.com" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseData, userEmail: "maria@test.com" });

    const roleSelect = screen.getAllByLabelText("users.modal.userRoleLabel")[0];
    fireEvent.change(roleSelect, { target: { value: "admin" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseData, userRole: "admin" });
  });

  it("renders empty values when data fields are null", () => {
    renderModal({
      data: {
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

  it("uses first role when userRole is empty", () => {
    renderModal({
      data: { ...baseData, userRole: "" },
      roles: [{ id: "admin", role: "Admin" }],
    });

    const roleSelect = screen.getAllByLabelText("users.modal.userRoleLabel")[0];
    expect(roleSelect).toHaveValue("admin");
  });

  it("submits form, calls addUser and resets data", async () => {
    const addUser = jest.fn(() => Promise.resolve());
    const setData = jest.fn();
    const setAddUsersShowModal = jest.fn();

    renderModal({
      addUser,
      setData,
      setAddUsersShowModal,
    });

    fireEvent.click(screen.getByText("users.modal.submitButton"));

    await waitFor(() => expect(addUser).toHaveBeenCalledWith(baseData));
    expect(setData).toHaveBeenCalledWith({
      userName: "",
      userPin: "",
      userPhone: "",
      userEmail: "",
      userRole: "Vendedor",
    });
    expect(setAddUsersShowModal).toHaveBeenCalledWith(false);
  });

  it("toggles pin visibility and closes on cancel", () => {
    const setAddUsersShowModal = jest.fn();
    renderModal({ setAddUsersShowModal });

    const pinInput = screen.getByLabelText("users.modal.userPinLabel");
    expect(pinInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show PIN" }));
    expect(pinInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Hide PIN" }));
    expect(pinInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByText("users.modal.cancelButton"));
    expect(setAddUsersShowModal).toHaveBeenCalledWith(false);
  });
});
