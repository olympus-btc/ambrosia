import { httpClient } from "@/lib/http";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

export async function processCheckout({
  items,
  amounts,
  selectedPaymentMethod,
  currencyId,
  user,
  transactionId = "",
  t,
}) {
  const response = await httpClient("/store/orders/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: user.user_id,
      items: items.map((item) => ({
        product_id: String(item?.id ?? ""),
        quantity: Number(item?.quantity) || 0,
        price_at_order: Number(item?.price) || 0,
      })),
      payment_method_id: selectedPaymentMethod,
      currency_id: currencyId,
      amount: amounts.amountFiat,
      transaction_id: transactionId || "",
    }),
  });

  const result = await parseJsonResponse(response, null);
  if (!result?.order_id) {
    throw new Error(t("errors.checkout"));
  }
  return result;
}
