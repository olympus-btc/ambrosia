import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { usePermissions } from "../usePermissions";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

let mockCanReadPermissions = true;
jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => mockCanReadPermissions,
}));

function TestComponent({ enabled = true }) {
  const { permissions, loading, error } = usePermissions({ enabled });

  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="count">{permissions.length}</span>
      <span data-testid="first">{permissions[0]?.name ?? ""}</span>
      <span data-testid="error">{error ? "yes" : "no"}</span>
    </div>
  );
}

describe("usePermissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockCanReadPermissions = true;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads permissions on mount", async () => {
    httpClient.mockResolvedValueOnce({});
    parseJsonResponse.mockResolvedValueOnce([{ name: "orders_read" }, { name: "products_read" }]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("first")).toHaveTextContent("orders_read");
  });

  it("sets empty array when response is null", async () => {
    httpClient.mockResolvedValueOnce({});
    parseJsonResponse.mockResolvedValueOnce(null);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("sets error when fetch fails", async () => {
    httpClient.mockRejectedValueOnce(new Error("Network error"));

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("error")).toHaveTextContent("yes");
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("calls /permissions endpoint", async () => {
    httpClient.mockResolvedValueOnce({});
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(httpClient).toHaveBeenCalledWith("/permissions");
  });

  it("does not request permissions when disabled", async () => {
    render(<TestComponent enabled={false} />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(httpClient).not.toHaveBeenCalled();
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("does not fetch permissions when the user lacks permissions_read", async () => {
    mockCanReadPermissions = false;

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(httpClient).not.toHaveBeenCalled();
  });
});
