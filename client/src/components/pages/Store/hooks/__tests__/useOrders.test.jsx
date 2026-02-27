import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useOrders } from "../useOrders";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

const handlers = {};

function TestComponent() {
  const { orders, loading, error, createOrder, updateOrder } = useOrders();

  useEffect(() => {
    handlers.createOrder = createOrder;
    handlers.updateOrder = updateOrder;
  }, [createOrder, updateOrder]);

  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="count">{orders.length}</span>
      <span data-testid="first-status">{orders[0]?.status ?? ""}</span>
      <span data-testid="error">{error ? "yes" : "no"}</span>
    </div>
  );
}

describe("useOrders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads orders on mount", async () => {
    httpClient.mockResolvedValueOnce({});
    parseJsonResponse.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("error")).toHaveTextContent("no");
  });

  it("sets error when fetching orders fails", async () => {
    httpClient.mockRejectedValueOnce(new Error("fetch-fail"));
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("error")).toHaveTextContent("yes");
  });

  it("sets empty orders when apiClient returns non-array", async () => {
    httpClient.mockResolvedValueOnce({});
    parseJsonResponse.mockResolvedValueOnce({ data: [] });
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("appends created orders to state", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([{ id: 1 }]);
    parseJsonResponse.mockResolvedValueOnce({ id: 2 });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await act(async () => {
      await handlers.createOrder({ note: "test" });
    });

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("2"));
  });

  it("does not append when createOrder returns without id", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([{ id: 1 }]);
    parseJsonResponse.mockResolvedValueOnce({ status: "ok" });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await act(async () => {
      await handlers.createOrder({ note: "test" });
    });

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
  });

  it("sets error when createOrder fails", async () => {
    httpClient.mockResolvedValueOnce({});
    httpClient.mockRejectedValueOnce(new Error("create-fail"));
    parseJsonResponse.mockResolvedValueOnce([]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    await expect(handlers.createOrder({ note: "test" })).rejects.toThrow("create-fail");
    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("yes"));
  });

  it("updates an order when updateOrder succeeds", async () => {
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValueOnce([{ id: 1, status: "open" }, { id: 2 }]);
    parseJsonResponse.mockResolvedValueOnce({ id: 1, status: "paid" });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("2"));

    await act(async () => {
      await handlers.updateOrder(1, { status: "paid" });
    });

    await waitFor(() => expect(screen.getByTestId("first-status")).toHaveTextContent("paid"));
  });

  it("sets error when updateOrder fails", async () => {
    httpClient.mockResolvedValueOnce({});
    httpClient.mockRejectedValueOnce(new Error("update-fail"));
    parseJsonResponse.mockResolvedValueOnce([{ id: 1, status: "open" }]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await expect(handlers.updateOrder(1, { status: "paid" })).rejects.toThrow("update-fail");
    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("yes"));
  });

  it("throws when updateOrder is called without an orderId", async () => {
    httpClient.mockResolvedValueOnce({});
    parseJsonResponse.mockResolvedValueOnce([]);
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    await expect(handlers.updateOrder()).rejects.toThrow("orderId is required");
  });
});
