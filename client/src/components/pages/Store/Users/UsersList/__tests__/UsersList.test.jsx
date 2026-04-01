import { render, screen, fireEvent } from "@testing-library/react";

import { UsersList } from "../UsersList";

jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
}));

jest.mock("../UsersCard", () => ({
  UsersCard: ({ user, onEditUser, onDeleteUser }) => (
    <div>
      <span>{user.name}</span>
      <button aria-label="Edit User" onClick={() => onEditUser(user)}>edit</button>
      <button aria-label="Delete User" onClick={() => onDeleteUser(user)}>delete</button>
    </div>
  ),
}));

jest.mock("../UsersTable", () => ({
  UsersTable: ({ users, onEditUser, onDeleteUser }) => (
    <table>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td><button aria-label="Edit User" onClick={() => onEditUser(user)}>edit</button></td>
            <td><button aria-label="Delete User" onClick={() => onDeleteUser(user)}>delete</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const users = [
  { id: 1, name: "Ivan", role: "Admin" },
  { id: 2, name: "Beto", role: "Seller" },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("UsersList", () => {
  it("renders all users", () => {
    render(<UsersList users={users} onEditUser={jest.fn()} onDeleteUser={jest.fn()} />);

    expect(screen.getAllByText("Ivan")).toHaveLength(2);
    expect(screen.getAllByText("Beto")).toHaveLength(2);
  });

  it("calls onEditUser when edit is pressed", () => {
    const onEditUser = jest.fn();
    render(<UsersList users={users} onEditUser={onEditUser} onDeleteUser={jest.fn()} />);

    fireEvent.click(screen.getAllByLabelText("Edit User")[0]);
    expect(onEditUser).toHaveBeenCalledWith(users[0]);
  });

  it("calls onDeleteUser when delete is pressed", () => {
    const onDeleteUser = jest.fn();
    render(<UsersList users={users} onEditUser={jest.fn()} onDeleteUser={onDeleteUser} />);

    fireEvent.click(screen.getAllByLabelText("Delete User")[0]);
    expect(onDeleteUser).toHaveBeenCalledWith(users[0]);
  });
});
