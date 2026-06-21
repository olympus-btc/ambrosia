import { httpClient } from "@/lib/http";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

export async function processCheckout({
  cartItems,
  paymentAmounts,
  selectedPaymentMethod,
  currencyId,
  user,
  transactionId = "",
  satoshiAmount = null,
  exchangeRateAtPayment = null,
  paymentHash = null,
  exchangeRateCurrency = null,
  fiatAmountAtPayment = null,
}) {
  const checkoutHttpResponse = await httpClient("/store/orders/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: user.userId,
      items: cartItems.map((item) => ({
        productId: String(item?.id ?? ""),
        quantity: Number(item?.quantity) || 0,
        priceAtOrder: Number(item?.price) || 0,
      })),
      paymentMethodId: selectedPaymentMethod,
      currencyId,
      amount: paymentAmounts.amountFiat,
      transactionId: transactionId || "",
      satoshiAmount,
      exchangeRateAtPayment,
      paymentHash,
      exchangeRateCurrency,
      fiatAmountAtPayment,
    }),
  });

  const storeCheckoutResult = await parseJsonResponse(checkoutHttpResponse, null);
  if (!storeCheckoutResult?.orderId) {
    throw new Error("errors.checkout");
  }
  return storeCheckoutResult;
}
