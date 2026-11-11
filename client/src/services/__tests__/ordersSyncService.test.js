jest.mock("@/lib/http/httpClient", () => ({
  httpClient: jest.fn(),
}));

jest.mock("@/lib/http/parseJsonResponse", () => ({
  parseJsonResponse: jest.fn(),
}));

jest.mock("@/components/pages/Store/utils/buildHttpError", () => ({
  buildParsedHttpError: jest.fn(),
}));

import { buildParsedHttpError } from "@/components/pages/Store/utils/buildHttpError";
import { httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

import { confirmPaymentWithoutOrder, getOrdersSyncFindings } from "../ordersSyncService";

function makeResponse(status, ok = true) {
  return { status, ok };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ordersSyncService", () => {
  describe("getOrdersSyncFindings", () => {
    it("requests the findings endpoint with startDate and endDate as query params", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ paymentsWithoutOrder: [], misdatedOrders: [] });

      await getOrdersSyncFindings("2024-01-01", "2024-01-31");

      expect(httpClient).toHaveBeenCalledWith(
        "/wallet/orders-sync/findings?startDate=2024-01-01&endDate=2024-01-31",
      );
    });

    it("returns the parsed findings on a successful fetch", async () => {
      const findings = { paymentsWithoutOrder: [{ paymentHash: "hash-1" }], misdatedOrders: [] };
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(findings);

      const returnedFindings = await getOrdersSyncFindings("2024-01-01", "2024-01-31");

      expect(returnedFindings).toEqual(findings);
    });

    it("throws a parsed HTTP error when the response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse(500, false));
      const httpError = new Error("Could not load Orders Sync findings");
      buildParsedHttpError.mockResolvedValue(httpError);

      await expect(getOrdersSyncFindings("2024-01-01", "2024-01-31")).rejects.toBe(httpError);
      expect(buildParsedHttpError).toHaveBeenCalledWith(
        expect.objectContaining({ status: 500, ok: false }),
        "Could not load Orders Sync findings",
      );
    });
  });

  describe("confirmPaymentWithoutOrder", () => {
    const storeCheckoutRequest = {
      userId: "user-1",
      items: [{ productId: "product-1", variantId: null, quantity: 1, priceAtOrder: 2100 }],
      paymentMethodId: "method-1",
      currencyId: "currency-1",
      amount: 21,
      transactionId: "",
      satoshiAmount: 21000,
      exchangeRateAtPayment: 100000,
      paymentHash: "hash-1",
      exchangeRateCurrency: "usd",
      fiatAmountAtPayment: 21,
      discountAmount: 0,
      tipAmount: 0,
    };

    it("posts the checkout request to the confirm endpoint", async () => {
      httpClient.mockResolvedValue(makeResponse(201));
      parseJsonResponse.mockResolvedValue({ orderId: "order-1", ticketId: "ticket-1", paymentId: "payment-1" });

      await confirmPaymentWithoutOrder(storeCheckoutRequest);

      expect(httpClient).toHaveBeenCalledWith(
        "/wallet/orders-sync/payments-without-order/confirm",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(storeCheckoutRequest),
        },
      );
    });

    it("returns the parsed checkout result on success", async () => {
      const checkoutResult = { orderId: "order-1", ticketId: "ticket-1", paymentId: "payment-1" };
      httpClient.mockResolvedValue(makeResponse(201));
      parseJsonResponse.mockResolvedValue(checkoutResult);

      const returnedCheckoutResult = await confirmPaymentWithoutOrder(storeCheckoutRequest);

      expect(returnedCheckoutResult).toEqual(checkoutResult);
    });

    it("throws a parsed HTTP error when the response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse(400, false));
      const httpError = new Error("Could not confirm the payment without an order");
      buildParsedHttpError.mockResolvedValue(httpError);

      await expect(confirmPaymentWithoutOrder(storeCheckoutRequest)).rejects.toBe(httpError);
      expect(buildParsedHttpError).toHaveBeenCalledWith(
        expect.objectContaining({ status: 400, ok: false }),
        "Could not confirm the payment without an order",
      );
    });
  });
});
