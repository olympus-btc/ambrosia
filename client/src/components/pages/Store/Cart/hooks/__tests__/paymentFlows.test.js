import { httpClient, parseJsonResponse as parseSharedJsonResponse } from "@/lib/http";
import { parseJsonResponse as parseCheckoutJsonResponse } from "@/lib/http/parseJsonResponse";

import { processCheckout } from "../paymentFlows";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

jest.mock("@/lib/http/parseJsonResponse", () => ({
  parseJsonResponse: jest.fn(),
}));

function buildCheckoutArgs(overrides = {}) {
  return {
    cartItems: [{ id: "product-1", variantId: "variant-1", quantity: 2, price: 1500 }],
    paymentAmounts: { amountFiat: 30, discountAmount: 0 },
    selectedPaymentMethod: "cash",
    currencyId: "currency-1",
    user: { userId: "user-1" },
    ...overrides,
  };
}

describe("processCheckout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns pending when checkout returns 202", async () => {
    httpClient.mockResolvedValueOnce({ ok: true, status: 202 });

    await expect(processCheckout(buildCheckoutArgs())).resolves.toEqual({ pending: true });

    expect(parseCheckoutJsonResponse).not.toHaveBeenCalled();
    expect(parseSharedJsonResponse).not.toHaveBeenCalled();
  });

  it("throws a parsed HTTP error when checkout returns a failed response", async () => {
    const failedCheckoutResponse = { ok: false, status: 500 };
    httpClient.mockResolvedValueOnce(failedCheckoutResponse);
    parseSharedJsonResponse.mockResolvedValueOnce({ message: "Checkout server error" });

    await expect(processCheckout(buildCheckoutArgs())).rejects.toMatchObject({
      message: "errors.checkout",
      status: 500,
      responseMessage: "Checkout server error",
    });

    expect(parseSharedJsonResponse).toHaveBeenCalledWith(failedCheckoutResponse, null);
    expect(parseCheckoutJsonResponse).not.toHaveBeenCalled();
  });

  it("returns checkout result when checkout succeeds with an order id", async () => {
    const successfulCheckoutResponse = { ok: true, status: 200 };
    const storeCheckoutResult = { orderId: "order-1", ticketId: "ticket-1" };
    httpClient.mockResolvedValueOnce(successfulCheckoutResponse);
    parseCheckoutJsonResponse.mockResolvedValueOnce(storeCheckoutResult);

    await expect(processCheckout(buildCheckoutArgs())).resolves.toEqual(storeCheckoutResult);

    expect(parseCheckoutJsonResponse).toHaveBeenCalledWith(successfulCheckoutResponse, null);
  });

  it("throws checkout fallback when successful response has no order id", async () => {
    httpClient.mockResolvedValueOnce({ ok: true, status: 200 });
    parseCheckoutJsonResponse.mockResolvedValueOnce({ ticketId: "ticket-1" });

    await expect(processCheckout(buildCheckoutArgs())).rejects.toThrow("errors.checkout");
  });
});
