import { httpWrapper } from "@/lib/http/httpWrapper";
import { CLIENT_LOG_REPORTS_ENDPOINT, LOG_LEVEL_ERROR } from "@/lib/logs";

import { buildClientLogReportPayload, CLIENT_LOG_REPORT_ORIGIN_BROWSER } from "./clientLogReportPayload";

export const DUPLICATE_REPORT_WINDOW_MILLISECONDS = 30000;
export const MAXIMUM_REPORTS_PER_MINUTE = 10;
const ONE_MINUTE_MILLISECONDS = 60000;
const SIGNATURE_STACK_PREFIX_LENGTH = 300;

const lastReportTimestampBySignature = new Map();
let recentReportTimestamps = [];

export function shouldSendClientLogReport(reportSignature, currentTimestamp = Date.now()) {
  recentReportTimestamps = recentReportTimestamps.filter(
    (reportTimestamp) => currentTimestamp - reportTimestamp < ONE_MINUTE_MILLISECONDS,
  );
  if (recentReportTimestamps.length >= MAXIMUM_REPORTS_PER_MINUTE) return false;

  const lastReportTimestamp = lastReportTimestampBySignature.get(reportSignature);
  const isDuplicateReport =
    lastReportTimestamp !== undefined && currentTimestamp - lastReportTimestamp < DUPLICATE_REPORT_WINDOW_MILLISECONDS;
  if (isDuplicateReport) return false;

  lastReportTimestampBySignature.set(reportSignature, currentTimestamp);
  recentReportTimestamps.push(currentTimestamp);
  return true;
}

export function resetClientErrorReportingState() {
  lastReportTimestampBySignature.clear();
  recentReportTimestamps = [];
}

export async function reportClientError({ level = LOG_LEVEL_ERROR, message, stack, context = {} }) {
  if (typeof window === "undefined" || !message) return;
  const clientLogReportPayload = buildClientLogReportPayload({
    level,
    message,
    stack,
    url: window.location.pathname,
    userAgent: window.navigator?.userAgent,
    origin: CLIENT_LOG_REPORT_ORIGIN_BROWSER,
    context,
  });
  const reportSignature = [
    clientLogReportPayload.level,
    clientLogReportPayload.message,
    (clientLogReportPayload.stack ?? "").slice(0, SIGNATURE_STACK_PREFIX_LENGTH),
  ].join("|");
  if (!shouldSendClientLogReport(reportSignature)) return;

  try {
    await httpWrapper(CLIENT_LOG_REPORTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify(clientLogReportPayload),
    });
  } catch {
    return;
  }
}
