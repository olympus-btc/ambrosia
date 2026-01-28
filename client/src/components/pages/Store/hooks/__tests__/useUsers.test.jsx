import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { apiClient } from "@/services/apiClient";

import { useUsers } from "../useUsers";

jest.mock("@/services/apiClient", () => ({
  apiClient: jest.fn(),
}));

const handlers = {};

function TestComponent() {
  const { users, loading, error, addUser, updateUser, deleteUser } = useUsers();

  useEffect(() => {
    handlers.addUser = addUser;
    handlers.updateUser = updateUser;
    handlers.deleteUser = deleteUser;
  }, [addUser, updateUser, deleteUser]);

  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="count">{users.length}</span>
      <span data-testid="first-name">{users[0]?.name ?? ""}</span>
      <span data-testid="error">{error ? "yes" : "no"}</span>
    </div>
  );
}

describe("useUsers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads users on mount", async () => {
    apiClient.mockResolvedValueOnce([{ id: 1, name: "Ana" }]);
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-name")).toHaveTextContent("Ana");
  });

  it("sets empty users when apiClient returns null", async () => {
    apiClient.mockResolvedValueOnce(null);
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("adds a user and refetches", async () => {
    apiClient.mockResolvedValueOnce([]);
    apiClient.mockResolvedValueOnce({ id: 9 });
    apiClient.mockResolvedValueOnce([{ id: 9, name: "Luis" }]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));

    let response;
    await act(async () => {
      response = await handlers.addUser({
        userName: "Luis",
        userPin: "1234",
        userRole: 2,
        userEmail: "luis@example.com",
        userPhone: "555-0101",
      });
    });

    expect(response).toEqual({ id: 9 });
    expect(apiClient).toHaveBeenCalledWith("/users", {
      method: "POST",
      body: {
        name: "Luis",
        pin: "1234",
        role: 2,
        email: "luis@example.com",
        phone: "555-0101",
      },
    });

    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveTextContent("Luis"));
  });

  it("updates a user and includes pin when provided", async () => {
    apiClient.mockResolvedValueOnce([{ id: 3, name: "Paula" }]);
    apiClient.mockResolvedValueOnce({ id: 3, name: "Paula" });
    apiClient.mockResolvedValueOnce([{ id: 3, name: "Paula" }]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await act(async () => {
      await handlers.updateUser({
        userId: 3,
        userName: "Paula",
        userRole: 1,
        userEmail: "paula@example.com",
        userPhone: "555-0202",
        userPin: "7777",
      });
    });

    expect(apiClient).toHaveBeenCalledWith("/users/3", {
      method: "PUT",
      body: {
        name: "Paula",
        role_id: 1,
        email: "paula@example.com",
        phone: "555-0202",
        pin: "7777",
      },
    });
  });

  it("updates a user without pin when blank", async () => {
    apiClient.mockResolvedValueOnce([{ id: 4, name: "Rosa" }]);
    apiClient.mockResolvedValueOnce({ id: 4, name: "Rosa" });
    apiClient.mockResolvedValueOnce([{ id: 4, name: "Rosa" }]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await act(async () => {
      await handlers.updateUser({
        userId: 4,
        userName: "Rosa",
        userRole: 3,
        userEmail: "rosa@example.com",
        userPhone: "555-0303",
        userPin: "   ",
      });
    });

    expect(apiClient).toHaveBeenCalledWith("/users/4", {
      method: "PUT",
      body: {
        name: "Rosa",
        role_id: 3,
        email: "rosa@example.com",
        phone: "555-0303",
      },
    });
  });

  it("deletes a user and refetches", async () => {
    apiClient.mockResolvedValueOnce([{ id: 6, name: "Tomas" }]);
    apiClient.mockResolvedValueOnce({ ok: true });
    apiClient.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await act(async () => {
      await handlers.deleteUser(6);
    });

    expect(apiClient).toHaveBeenCalledWith("/users/6", {
      method: "DELETE",
    });
  });
});
