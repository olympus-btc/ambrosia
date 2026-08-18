import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { usePayments } from "../usePayments";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

jest.mock("@heroui/react", () => ({
  addToast: jest.fn(),
}));

jest.mock("next-intl", () => {
  const errorsTranslations = (key) => key;
  return { useTranslations: () => errorsTranslations };
});

const handlers = {};

function TestComponent() {
  const { payments, loading, error, refetch } = usePayments();

  useEffect(() => {
    handlers.refetch = refetch;
  }, [refetch]);

  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="count">{payments.length}</span>
      <span data-testid="first-payment">{payments[0]?.id ?? ""}</span>
      <span data-testid="error">{error ? "yes" : "no"}</span>
    </div>
  );
}

describe("usePayments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads payments on mount", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: "p1" }, { id: "p2" }]);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("first-payment")).toHaveTextContent("p1");
  });

  it("sets empty payments when response is null", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce(null);

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("returns null and shows no toast when connection fails", async () => {
    const { addToast } = require("@heroui/react");
    httpClient.mockResolvedValueOnce({ ok: false, status: 500 });

    render(<TestComponent />);

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ color: "danger" }),
    );
  });

  it("refetches payments", async () => {
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: "p1" }]);
    parseJsonResponse.mockResolvedValueOnce([{ id: "p1" }, { id: "p2" }]);

    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));

    await act(async () => {
      await handlers.refetch();
    });

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("2"));
  });
});
