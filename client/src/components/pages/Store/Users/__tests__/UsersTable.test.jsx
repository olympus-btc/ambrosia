import { render, screen, fireEvent } from "@testing-library/react";

import { UsersTable } from "../UsersTable";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
  RequirePermission: ({ children }) => children,
}));

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

const users = [
  { id: 1, name: "Alice", role: "Admin", email: "alice@test.com", phone: "1111111111" },
  { id: 2, name: "Bob", role: "Seller", email: "bob@test.com", phone: "2222222222" },
];

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

const renderTable = (props = {}) => render(
  <UsersTable
    users={users}
    onEditUser={jest.fn()}
    onDeleteUser={jest.fn()}
    {...props}
  />,
);

describe("UsersTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders rows with name, role, email and phone", () => {
    renderTable();

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    expect(screen.getByText("1111111111")).toBeInTheDocument();
  });

  it("calls edit and delete callbacks", () => {
    const onEditUser = jest.fn();
    const onDeleteUser = jest.fn();

    renderTable({ onEditUser, onDeleteUser });

    fireEvent.click(screen.getAllByRole("button", { name: "Edit User" })[0]);
    expect(onEditUser).toHaveBeenCalledWith(users[0]);

    fireEvent.click(screen.getAllByRole("button", { name: "Delete User" })[1]);
    expect(onDeleteUser).toHaveBeenCalledWith(users[1]);
  });
});
