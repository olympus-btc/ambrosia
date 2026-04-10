import { render, screen, fireEvent } from "@testing-library/react";

import { UsersCard } from "../UsersCard";

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

jest.mock("@/hooks/usePermission", () => ({
  RequirePermission: ({ children }) => <>{children}</>,
}));

jest.mock("@/components/shared/EditButton", () => ({
  EditButton: ({ onPress }) => <button aria-label="Edit User" onClick={onPress}>edit</button>,
}));

jest.mock("@/components/shared/DeleteButton", () => ({
  DeleteButton: ({ onPress }) => <button aria-label="Delete User" onClick={onPress}>delete</button>,
}));

jest.mock("@heroui/react", () => ({
  Card: ({ children, className }) => <div className={className}>{children}</div>,
  CardBody: ({ children }) => <div>{children}</div>,
  Chip: ({ children }) => <span>{children}</span>,
}));

const user = { id: 1, name: "Ivan", role: "Admin" };

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("UsersCard", () => {
  it("renders user name and role", () => {
    render(<UsersCard user={user} canManageUsers={false} onEditUser={jest.fn()} onDeleteUser={jest.fn()} />);

    expect(screen.getByText("Ivan")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders noRole when role is missing", () => {
    render(<UsersCard user={{ ...user, role: null }} canManageUsers={false} onEditUser={jest.fn()} onDeleteUser={jest.fn()} />);

    expect(screen.getByText("users.noRole")).toBeInTheDocument();
  });

  it("hides action buttons when canManageUsers is false", () => {
    render(<UsersCard user={user} canManageUsers={false} onEditUser={jest.fn()} onDeleteUser={jest.fn()} />);

    expect(screen.queryByLabelText("Edit User")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Delete User")).not.toBeInTheDocument();
  });

  it("shows action buttons when canManageUsers is true", () => {
    render(<UsersCard user={user} canManageUsers onEditUser={jest.fn()} onDeleteUser={jest.fn()} />);

    expect(screen.getByLabelText("Edit User")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete User")).toBeInTheDocument();
  });

  it("calls onEditUser when edit is pressed", () => {
    const onEditUser = jest.fn();
    render(<UsersCard user={user} canManageUsers onEditUser={onEditUser} onDeleteUser={jest.fn()} />);

    fireEvent.click(screen.getByLabelText("Edit User"));
    expect(onEditUser).toHaveBeenCalledWith(user);
  });

  it("calls onDeleteUser when delete is pressed", () => {
    const onDeleteUser = jest.fn();
    render(<UsersCard user={user} canManageUsers onEditUser={jest.fn()} onDeleteUser={onDeleteUser} />);

    fireEvent.click(screen.getByLabelText("Delete User"));
    expect(onDeleteUser).toHaveBeenCalledWith(user);
  });
});
