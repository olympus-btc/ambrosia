import { render, screen, waitFor } from "@testing-library/react";

import { httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

import { usePaymentMethods } from "../usePaymentMethod";

jest.mock("@/lib/http/httpClient", () => ({
  httpClient: jest.fn(),
}));

jest.mock("@/lib/http/parseJsonResponse", () => ({
  parseJsonResponse: jest.fn(),
}));

function TestComponent() {
  const { paymentMethods, loading, error } = usePaymentMethods();
  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="count">{paymentMethods.length}</span>
      <span data-testid="error">{error ? "yes" : "no"}</span>
    </div>
  );
}

describe("usePaymentMethods", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads payment methods when response returns array", async () => {
    httpClient.mockResolvedValueOnce({});
    parseJsonResponse.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("error")).toHaveTextContent("no");
  });

  it("sets empty list when response returns non-array", async () => {
    httpClient.mockResolvedValueOnce({});
    parseJsonResponse.mockResolvedValueOnce({ data: [] });
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("sets error when httpClient rejects", async () => {
    httpClient.mockRejectedValue(new Error("fail"));
    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("error")).toHaveTextContent("yes");
  });
});
