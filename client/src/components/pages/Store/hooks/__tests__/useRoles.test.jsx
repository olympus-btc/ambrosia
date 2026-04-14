import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useRoles } from "../useRoles";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
}));

const handlers = {};

function TestComponent() {
  const { roles, loading, error, createRole, updateRoleWithPermissions, deleteRole, getRolePermissions, assignPermissions } = useRoles();

  useEffect(() => {
    handlers.createRole = createRole;
    handlers.updateRoleWithPermissions = updateRoleWithPermissions;
    handlers.deleteRole = deleteRole;
    handlers.getRolePermissions = getRolePermissions;
    handlers.assignPermissions = assignPermissions;
  }, [createRole, updateRoleWithPermissions, deleteRole, getRolePermissions, assignPermissions]);

  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="count">{roles.length}</span>
      <span data-testid="first-role">{roles[0]?.role ?? ""}</span>
      <span data-testid="error">{error ? "yes" : "no"}</span>
    </div>
  );
}

describe("useRoles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads roles on mount", async () => {
    httpClient.mockResolvedValueOnce({});
    parseJsonResponse.mockResolvedValueOnce([{ id: "1", role: "cashier" }]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("first-role")).toHaveTextContent("cashier");
  });

  it("sets empty roles when response is null", async () => {
    httpClient.mockResolvedValueOnce({});
    parseJsonResponse.mockResolvedValueOnce(null);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("creates a role without permissions and refetches", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce({ id: "abc" });
    parseJsonResponse.mockResolvedValueOnce([{ id: "abc", role: "seller" }]);

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));

    await act(async () => {
      await handlers.createRole({ name: "seller", isAdmin: false, permissions: [] });
    });

    expect(httpClient).toHaveBeenCalledWith("/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "seller", isAdmin: false }),
    });
    await waitFor(() => expect(screen.getByTestId("first-role")).toHaveTextContent("seller"));
  });

  it("creates a role with password and permissions", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce({ id: "xyz" });
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    await act(async () => {
      await handlers.createRole({ name: "manager", password: "secret", isAdmin: false, permissions: ["orders_read"] });
    });

    expect(httpClient).toHaveBeenCalledWith("/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "manager", isAdmin: false, password: "secret" }),
    });
    expect(httpClient).toHaveBeenCalledWith("/roles/xyz/permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: ["orders_read"] }),
    });
  });

  it("updates role with permissions and refetches", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([{ id: "1", role: "cashier" }]);
    parseJsonResponse.mockResolvedValueOnce([{ id: "1", role: "updated" }]);

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("first-role")).toHaveTextContent("cashier"));

    await act(async () => {
      await handlers.updateRoleWithPermissions("1", {
        name: "updated",
        isAdmin: false,
        permissions: ["products_read"],
      });
    });

    expect(httpClient).toHaveBeenCalledWith("/roles/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "updated", isAdmin: false }),
    });
    expect(httpClient).toHaveBeenCalledWith("/roles/1/permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: ["products_read"] }),
    });
  });

  it("deletes a role and refetches", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([{ id: "1", role: "cashier" }]);
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await act(async () => {
      await handlers.deleteRole("1");
    });

    expect(httpClient).toHaveBeenCalledWith("/roles/1", { method: "DELETE" });
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
  });

  it("throws conflict when deleting role is rejected", async () => {
    httpClient.mockResolvedValueOnce({});
    parseJsonResponse.mockResolvedValueOnce([{ id: "1", role: "admin" }]);
    httpClient.mockResolvedValueOnce({ ok: false, status: 409 });

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    let thrown;
    await act(async () => {
      try {
        await handlers.deleteRole("1");
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown?.status).toBe(409);
  });

  it("fetches role permissions by id", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([]);
    parseJsonResponse.mockResolvedValueOnce([{ name: "orders_read" }, { name: "products_read" }]);

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    let result;
    await act(async () => {
      result = await handlers.getRolePermissions("1");
    });

    expect(httpClient).toHaveBeenCalledWith("/roles/1/permissions");
    expect(result).toEqual([{ name: "orders_read" }, { name: "products_read" }]);
  });

  it("returns empty array when getRolePermissions called with no id", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    let result;
    await act(async () => {
      result = await handlers.getRolePermissions(null);
    });

    expect(result).toEqual([]);
  });

  it("does nothing when assignPermissions called with no roleId", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    await act(async () => {
      await handlers.assignPermissions(null, ["orders_read"]);
    });

    expect(httpClient).toHaveBeenCalledTimes(1);
  });
});
