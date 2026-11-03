import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { usePaymentMethods } from "../usePaymentMethod";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

let mockCanReadPaymentMethods = true;
jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => mockCanReadPaymentMethods,
}));

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

function TestComponent() {
  const { paymentMethods, loading, error, forbidden } = usePaymentMethods();
  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="count">{paymentMethods.length}</span>
      <span data-testid="error">{error ? "yes" : "no"}</span>
      <span data-testid="forbidden">{forbidden ? "yes" : "no"}</span>
      <span data-testid="order">{paymentMethods.map((method) => method.name).join(",")}</span>
    </div>
  );
}

describe("usePaymentMethods", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockCanReadPaymentMethods = true;
  });

  it("loads payment methods when response returns array", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("error")).toHaveTextContent("no");
  });

  it("sorts BTC first, then the rest alphabetically", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([
      { id: 1, name: "Debit Card" },
      { id: 2, name: "Bank Transfer" },
      { id: 3, name: "BTC" },
      { id: 4, name: "Cash" },
      { id: 5, name: "Credit Card" },
    ]);
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("order")).toHaveTextContent(
      "BTC,Bank Transfer,Cash,Credit Card,Debit Card",
    );
  });

  it("sets empty list when response returns non-array", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce({ data: [] });
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("sets error when httpClient rejects", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    httpClient.mockRejectedValue(new Error("fail"));
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("error")).toHaveTextContent("yes");
    console.error.mockRestore();
  });

  it("sets error when the response is not ok", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    httpClient.mockResolvedValueOnce({ ok: false, status: 500 });
    parseJsonResponse.mockResolvedValueOnce(null);
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("error")).toHaveTextContent("yes");
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    console.error.mockRestore();
  });

  it("does not fetch payment methods when the user lacks payments_read", async () => {
    mockCanReadPaymentMethods = false;

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("forbidden")).toHaveTextContent("yes");
    expect(httpClient).not.toHaveBeenCalled();
  });
});
