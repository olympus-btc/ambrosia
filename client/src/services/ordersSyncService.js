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
