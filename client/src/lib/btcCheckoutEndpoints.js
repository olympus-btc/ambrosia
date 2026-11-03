export const BTC_CHECKOUT_ENDPOINT = "/store/orders/checkout";

export function buildBtcCheckoutPaymentStatusEndpoint(paymentHash) {
  return `/store/orders/payment-status/${paymentHash}`;
}
