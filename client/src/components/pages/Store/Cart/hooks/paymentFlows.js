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
      items: cartItems.map((cartItem) => ({
        productId: String(cartItem.productId ?? cartItem.id ?? ""),
        variantId: cartItem.variantId ?? null,
        quantity: Number(cartItem?.quantity) || 0,
        priceAtOrder: Number(cartItem?.price) || 0,
      })),
      paymentMethodId: selectedPaymentMethod,
      currencyId,
      amount: paymentAmounts.amountFiat,
      discountAmount: paymentAmounts.discountAmount,
      transactionId: transactionId || "",
      satoshiAmount,
      exchangeRateAtPayment,
      paymentHash,
      exchangeRateCurrency,
      fiatAmountAtPayment,
    }),
  });

  if (checkoutHttpResponse.status === 202) {
    return { pending: true };
  }

  const storeCheckoutResult = await parseJsonResponse(checkoutHttpResponse, null);
  if (!storeCheckoutResult?.orderId) {
    throw new Error("errors.checkout");
  }
  return storeCheckoutResult;
}
