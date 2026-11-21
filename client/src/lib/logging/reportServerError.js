import { API_URL } from "@/config/api";
import { CLIENT_LOG_REPORTS_ENDPOINT } from "@/lib/logs";

import {
  buildClientLogReportPayload,
  CLIENT_LOG_REPORT_ORIGIN_NEXT_SERVER,
  normalizeReportedError,
} from "./clientLogReportPayload";

const REPORT_TIMEOUT_MILLISECONDS = 3000;

export async function reportServerError(incomingRequest, serverError, reportContext = {}) {
  const incomingRequestCookieHeader = incomingRequest?.headers?.get("cookie");
  if (!incomingRequestCookieHeader) return;

  const { message, stack } = normalizeReportedError(serverError);
  const clientLogReportPayload = buildClientLogReportPayload({
    message,
    stack,
    url: incomingRequest?.url ? new URL(incomingRequest.url).pathname : undefined,
    origin: CLIENT_LOG_REPORT_ORIGIN_NEXT_SERVER,
    context: reportContext,
  });

  try {
    await fetch(`${API_URL}${CLIENT_LOG_REPORTS_ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: incomingRequestCookieHeader },
      signal: AbortSignal.timeout(REPORT_TIMEOUT_MILLISECONDS),
      body: JSON.stringify(clientLogReportPayload),
    });
  } catch {
    return;
  }
}
