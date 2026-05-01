import { httpClient } from "@/lib/http";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

export async function processCheckout({
  cartItems,
  paymentAmounts,
  selectedPaymentMethod,
  currencyId,
  user,
  transactionId = "",
  t,
}) {
  const checkoutHttpResponse = await httpClient("/store/orders/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: user.user_id,
      items: cartItems.map((item) => ({
        product_id: String(item?.id ?? ""),
        quantity: Number(item?.quantity) || 0,
        price_at_order: Number(item?.price) || 0,
      })),
      payment_method_id: selectedPaymentMethod,
      currency_id: currencyId,
      amount: paymentAmounts.amountFiat,
      transaction_id: transactionId || "",
    }),
  });

  const storeCheckoutResult = await parseJsonResponse(checkoutHttpResponse, null);
  if (!storeCheckoutResult?.order_id) {
    throw new Error(t("errors.checkout"));
  }
  return storeCheckoutResult;
}
