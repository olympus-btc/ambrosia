import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useCurrency } from "../useCurrency";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

const handlers = {};

function TestComponent() {
  const { currency, updateCurrency, formatAmount, refetch } = useCurrency();

  useEffect(() => {
    handlers.updateCurrency = updateCurrency;
    handlers.formatAmount = formatAmount;
    handlers.refetch = refetch;
  }, [updateCurrency, formatAmount, refetch]);

  return (
    <div>
      <span data-testid="acronym">{currency.acronym}</span>
      <span data-testid="symbol">{currency.symbol}</span>
      <span data-testid="locale">{currency.locale}</span>
      <span data-testid="country_code">{currency.country_code ?? "null"}</span>
    </div>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useCurrency", () => {
  describe("Initial fetch", () => {
    it("fetches currency from /base-currency on mount", async () => {
      httpClient.mockResolvedValueOnce({});
      parseJsonResponse.mockResolvedValueOnce({ acronym: "MXN", symbol: "$", country_code: "MX" });

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId("acronym")).toHaveTextContent("MXN");
      });
      expect(httpClient).toHaveBeenCalledWith("/base-currency");
    });

    it("falls back to DEFAULT_CURRENCY when API returns null", async () => {
      httpClient.mockResolvedValueOnce({});
      parseJsonResponse.mockResolvedValueOnce(null);

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId("acronym")).toHaveTextContent("USD");
      });
    });

    it("falls back to DEFAULT_CURRENCY on fetch error", async () => {
      httpClient.mockRejectedValueOnce(new Error("network error"));

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId("acronym")).toHaveTextContent("USD");
      });
    });
  });

  describe("parseCurrencyData", () => {
    it("uses currency_id when id is absent", async () => {
      httpClient.mockResolvedValueOnce({});
      parseJsonResponse.mockResolvedValueOnce({ currency_id: 42, acronym: "EUR", symbol: "€" });

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId("acronym")).toHaveTextContent("EUR");
        expect(screen.getByTestId("symbol")).toHaveTextContent("€");
      });
    });

    it("derives locale from country_code", async () => {
      httpClient.mockResolvedValueOnce({});
      parseJsonResponse.mockResolvedValueOnce({ acronym: "MXN", symbol: "$", country_code: "MX" });

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId("locale")).toHaveTextContent("mx-MX");
        expect(screen.getByTestId("country_code")).toHaveTextContent("MX");
      });
    });

    it("uses DEFAULT acronym when response has no acronym", async () => {
      httpClient.mockResolvedValueOnce({});
      parseJsonResponse.mockResolvedValueOnce({ symbol: "£" });

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId("acronym")).toHaveTextContent("USD");
        expect(screen.getByTestId("symbol")).toHaveTextContent("£");
      });
    });
  });

  describe("formatAmount", () => {
    beforeEach(async () => {
      httpClient.mockResolvedValueOnce({});
      parseJsonResponse.mockResolvedValueOnce({
        acronym: "USD",
        symbol: "$",
        country_code: "US",
        locale: "en-US",
      });
      render(<TestComponent />);
      await waitFor(() => expect(screen.getByTestId("acronym")).toHaveTextContent("USD"));
    });

    it("formats cents to currency string with symbol", () => {
      const result = handlers.formatAmount(1000);
      expect(result).toBe("$ 10.00");
    });

    it("formats zero cents", () => {
      const result = handlers.formatAmount(0);
      expect(result).toBe("$ 0.00");
    });

    it("returns the value as-is when not a finite number", () => {
      expect(handlers.formatAmount("not-a-number")).toBe("not-a-number");
      expect(handlers.formatAmount(NaN)).toBe(NaN);
      expect(handlers.formatAmount(undefined)).toBe(undefined);
    });

    it("formats large amounts correctly", () => {
      const result = handlers.formatAmount(100000);
      expect(result).toBe("$ 1,000.00");
    });
  });

  describe("updateCurrency", () => {
    beforeEach(async () => {
      httpClient.mockResolvedValue({});
      parseJsonResponse.mockResolvedValue({ acronym: "USD", symbol: "$" });
      render(<TestComponent />);
      await waitFor(() => expect(screen.getByTestId("acronym")).toHaveTextContent("USD"));
    });

    it("calls PUT /base-currency with acronym from object", async () => {
      await act(async () => {
        await handlers.updateCurrency({ acronym: "EUR" });
      });

      expect(httpClient).toHaveBeenCalledWith("/base-currency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acronym: "EUR" }),
      });
    });

    it("calls PUT /base-currency with acronym from string", async () => {
      await act(async () => {
        await handlers.updateCurrency("MXN");
      });

      expect(httpClient).toHaveBeenCalledWith("/base-currency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acronym: "MXN" }),
      });
    });

    it("falls back to DEFAULT acronym when no acronym provided", async () => {
      await act(async () => {
        await handlers.updateCurrency({});
      });

      expect(httpClient).toHaveBeenCalledWith("/base-currency", expect.objectContaining({
        body: JSON.stringify({ acronym: "USD" }),
      }));
    });

    it("refetches currency after update", async () => {
      const callsBefore = httpClient.mock.calls.length;

      await act(async () => {
        await handlers.updateCurrency({ acronym: "EUR" });
      });

      await waitFor(() => {
        expect(httpClient.mock.calls.length).toBeGreaterThan(callsBefore + 1);
      });
    });
  });

  describe("Cleanup on unmount", () => {
    it("does not update state after unmount", async () => {
      let resolveHttp;
      httpClient.mockReturnValueOnce(new Promise((res) => { resolveHttp = res; }));

      const { unmount } = render(<TestComponent />);
      unmount();

      await act(async () => {
        resolveHttp({});
      });
    });
  });
});
