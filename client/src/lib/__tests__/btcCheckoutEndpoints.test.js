import { BTC_CHECKOUT_ENDPOINT, buildBtcCheckoutPaymentStatusEndpoint } from "../btcCheckoutEndpoints";

describe("btcCheckoutEndpoints", () => {
  it("exposes the checkout endpoint with a leading slash", () => {
    expect(BTC_CHECKOUT_ENDPOINT).toBe("/store/orders/checkout");
  });

  it("builds the payment-status endpoint with a leading slash for the given payment hash", () => {
    expect(buildBtcCheckoutPaymentStatusEndpoint("hash-1")).toBe("/store/orders/payment-status/hash-1");
  });
});
