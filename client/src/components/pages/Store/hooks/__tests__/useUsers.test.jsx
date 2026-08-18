import { act, useEffect } from "react";

import { addToast } from "@heroui/react";
import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useUsers } from "../useUsers";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

jest.mock("next-intl", () => {
  const usersTranslations = (key) => key;
  return { useTranslations: () => usersTranslations };
});

const handlers = {};

function TestComponent({ skipForbiddenRedirect } = {}) {
  const { users, loading, error, forbidden, addUser, updateUser, deleteUser } = useUsers({ skipForbiddenRedirect });

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
      <span data-testid="forbidden">{forbidden ? "yes" : "no"}</span>
    </div>
  );
}

describe("useUsers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads users on mount", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: 1, name: "Ana" }]);
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-name")).toHaveTextContent("Ana");
  });

  it("sets empty users when apiClient returns null", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce(null);
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("sets forbidden when the response is 403", async () => {
    httpClient.mockResolvedValueOnce({ ok: false, status: 403 });
    render(<TestComponent skipForbiddenRedirect />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("forbidden")).toHaveTextContent("yes");
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("passes skipForbiddenRedirect through to httpClient", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([]);
    render(<TestComponent skipForbiddenRedirect />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(httpClient).toHaveBeenCalledWith("/users", { skipForbiddenRedirect: true });
  });

  it("adds a user and refetches", async () => {
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce([{ id: 9, name: "Luis" }]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));

    let addUserResponse;
    await act(async () => {
      addUserResponse = await handlers.addUser({
        userName: "Luis",
        userPin: "123456",
        userRole: 2,
        userEmail: "luis@example.com",
        userPhone: "555-0101",
      });
    });

    expect(addUserResponse).toEqual({ ok: true });
    expect(httpClient).toHaveBeenCalledWith("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Luis",
        pin: "123456",
        role: 2,
        email: "luis@example.com",
        phone: "555-0101",
      }),
    });

    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveTextContent("Luis"));
  });

  it("updates a user and includes pin when provided", async () => {
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: 3, name: "Paula" }]);
    parseJsonResponse.mockResolvedValueOnce([{ id: 3, name: "Paula" }]);
    parseJsonResponse.mockResolvedValueOnce({ id: 3, name: "Paula" });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await act(async () => {
      await handlers.updateUser({
        userId: 3,
        userName: "Paula",
        userRole: 1,
        userEmail: "paula@example.com",
        userPhone: "555-0202",
        userPin: "777777",
      });
    });

    expect(httpClient).toHaveBeenCalledWith("/users/3", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Paula",
        roleId: 1,
        email: "paula@example.com",
        phone: "555-0202",
        pin: "777777",
      }),
    });
  });

  it("updates a user without pin when blank", async () => {
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: 4, name: "Rosa" }]);
    parseJsonResponse.mockResolvedValueOnce([{ id: 4, name: "Rosa" }]);
    parseJsonResponse.mockResolvedValueOnce({ id: 4, name: "Rosa" });

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

    expect(httpClient).toHaveBeenCalledWith("/users/4", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Rosa",
        roleId: 3,
        email: "rosa@example.com",
        phone: "555-0303",
      }),
    });
  });

  it("deletes a user and refetches", async () => {
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: 6, name: "Tomas" }]);
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await act(async () => {
      await handlers.deleteUser(6);
    });

    expect(httpClient).toHaveBeenCalledWith("/users/6", {
      method: "DELETE",
    });
  });

  it("shows last admin toast when deleting user returns conflict", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: 6, name: "Tomas" }]);
    httpClient.mockResolvedValueOnce({ ok: false, status: 409 });
    parseJsonResponse.mockResolvedValueOnce({ message: "Cannot remove the last admin user" });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await expect(handlers.deleteUser(6)).rejects.toMatchObject({ status: 409 });

    expect(addToast).toHaveBeenCalledWith({
      title: "toasts.lastAdminTitle",
      description: "toasts.lastAdminDescription",
      color: "warning",
    });
  });

  it("shows duplicate name toast and rejects when adding user returns conflict", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([]);
    httpClient.mockResolvedValueOnce({ ok: false, status: 409 });
    parseJsonResponse.mockResolvedValueOnce({ message: "Duplicate user" });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));

    await expect(handlers.addUser({
      userName: "Luis",
      userPin: "1234",
      userRole: 2,
      userEmail: "luis@example.com",
      userPhone: "555-0101",
    })).rejects.toMatchObject({ status: 409 });

    expect(addToast).toHaveBeenCalledWith({
      title: "toasts.duplicateNameTitle",
      description: "toasts.duplicateNameDescription",
      color: "danger",
    });
  });

  it("shows generic error toast and rejects when updating user fails", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: 3, name: "Paula" }]);
    httpClient.mockResolvedValueOnce({ ok: false, status: 500 });
    parseJsonResponse.mockResolvedValueOnce({ message: "Server error" });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await expect(handlers.updateUser({
      userId: 3,
      userName: "Paula",
      userRole: 1,
      userEmail: "paula@example.com",
      userPhone: "555-0202",
      userPin: "",
    })).rejects.toMatchObject({ status: 500 });

    expect(addToast).toHaveBeenCalledWith({
      title: "toasts.genericErrorTitle",
      description: "toasts.genericErrorDescription",
      color: "danger",
    });
  });

  it("shows admin-required toast when assigning an admin role is forbidden", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: 3, name: "Paula" }]);
    httpClient.mockResolvedValueOnce({ ok: false, status: 403 });
    parseJsonResponse.mockResolvedValueOnce({ message: "Admin privileges required" });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await expect(handlers.updateUser({
      userId: 3,
      userName: "Paula",
      userRole: "admin-role-id",
      userEmail: "paula@example.com",
      userPhone: "555-0202",
      userPin: "",
    })).rejects.toMatchObject({ status: 403 });

    expect(addToast).toHaveBeenCalledWith({
      title: "toasts.adminRequiredTitle",
      description: "toasts.adminRequiredDescription",
      color: "warning",
    });
  });
});
