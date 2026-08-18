import { act, useEffect } from "react";

import { render, screen } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { usePaymentCurrency } from "../usePaymentCurrency";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

let mockCanReadPaymentCurrency = true;
jest.mock("@/hooks/usePermission", () => ({
  usePermission: () => mockCanReadPaymentCurrency,
}));

const handlers = {};

function TestComponent() {
  const { getPaymentCurrencyById, forbidden } = usePaymentCurrency();

  useEffect(() => {
    handlers.getPaymentCurrencyById = getPaymentCurrencyById;
  }, [getPaymentCurrencyById]);

  return (
    <div>
      <span data-testid="forbidden">{forbidden ? "yes" : "no"}</span>
    </div>
  );
}

describe("usePaymentCurrency", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanReadPaymentCurrency = true;
  });

  it("fetches payment currency by id", async () => {
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValueOnce({ id: "c1", acronym: "USD" });

    render(<TestComponent />);

    let paymentCurrency;
    await act(async () => {
      paymentCurrency = await handlers.getPaymentCurrencyById("c1");
    });

    expect(httpClient).toHaveBeenCalledWith("/payments/currencies/c1");
    expect(paymentCurrency).toEqual({ id: "c1", acronym: "USD" });
  });

  it("returns null when called with no id", async () => {
    render(<TestComponent />);

    let paymentCurrency;
    await act(async () => {
      paymentCurrency = await handlers.getPaymentCurrencyById(null);
    });

    expect(paymentCurrency).toBeNull();
    expect(httpClient).not.toHaveBeenCalled();
  });

  it("does not fetch payment currency when the user lacks payments_read", async () => {
    mockCanReadPaymentCurrency = false;

    render(<TestComponent />);
    expect(screen.getByTestId("forbidden")).toHaveTextContent("yes");

    let paymentCurrency;
    await act(async () => {
      paymentCurrency = await handlers.getPaymentCurrencyById("c1");
    });

    expect(paymentCurrency).toBeNull();
    expect(httpClient).not.toHaveBeenCalled();
  });
});
