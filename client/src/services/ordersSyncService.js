import { buildParsedHttpError } from "@/components/pages/Store/utils/buildHttpError";
import { httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

export async function getOrdersSyncFindings(startDate, endDate) {
  const findingsQueryParams = new URLSearchParams({ startDate, endDate });
  const findingsResponse = await httpClient(`/wallet/orders-sync/findings?${findingsQueryParams.toString()}`);
  if (!findingsResponse.ok) {
    throw await buildParsedHttpError(findingsResponse, "Could not load Orders Sync findings");
  }
  return await parseJsonResponse(findingsResponse, null);
}

export async function confirmPaymentWithoutOrder(storeCheckoutRequest) {
  const checkoutResponse = await httpClient("/wallet/orders-sync/payments-without-order/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(storeCheckoutRequest),
  });
  if (!checkoutResponse.ok) {
    throw await buildParsedHttpError(checkoutResponse, "Could not confirm the payment without an order");
  }
  return await parseJsonResponse(checkoutResponse, null);
}
