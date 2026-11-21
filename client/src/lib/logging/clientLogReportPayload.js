import { LOG_LEVEL_ERROR } from "@/lib/logs";

export const CLIENT_LOG_REPORT_ORIGIN_BROWSER = "browser";
export const CLIENT_LOG_REPORT_ORIGIN_NEXT_SERVER = "next-server";
export const MAXIMUM_REPORTED_MESSAGE_LENGTH = 2000;
export const MAXIMUM_REPORTED_STACK_LENGTH = 8000;
export const MAXIMUM_REPORTED_URL_LENGTH = 500;
export const MAXIMUM_REPORTED_USER_AGENT_LENGTH = 300;
export const MAXIMUM_REPORTED_CONTEXT_ENTRIES = 10;
export const MAXIMUM_REPORTED_CONTEXT_KEY_LENGTH = 50;
export const MAXIMUM_REPORTED_CONTEXT_VALUE_LENGTH = 200;

function truncateOptionalText(optionalText, maximumLength) {
  if (optionalText === undefined || optionalText === null) return undefined;
  return String(optionalText).slice(0, maximumLength);
}

function limitReportedContext(reportedContext) {
  return Object.fromEntries(
    Object.entries(reportedContext ?? {})
      .slice(0, MAXIMUM_REPORTED_CONTEXT_ENTRIES)
      .map(([contextKey, contextValue]) => [
        String(contextKey).slice(0, MAXIMUM_REPORTED_CONTEXT_KEY_LENGTH),
        String(contextValue).slice(0, MAXIMUM_REPORTED_CONTEXT_VALUE_LENGTH),
      ]),
  );
}

export function normalizeReportedError(reportedErrorOrReason) {
  if (reportedErrorOrReason instanceof Error) {
    return {
      message: reportedErrorOrReason.message || reportedErrorOrReason.name,
      stack: reportedErrorOrReason.stack,
    };
  }
  if (typeof reportedErrorOrReason === "string") return { message: reportedErrorOrReason, stack: undefined };
  try {
    return { message: JSON.stringify(reportedErrorOrReason), stack: undefined };
  } catch {
    return { message: String(reportedErrorOrReason), stack: undefined };
  }
}

export function buildClientLogReportPayload({
  level = LOG_LEVEL_ERROR,
  message,
  stack,
  url,
  userAgent,
  origin,
  context = {},
}) {
  return {
    level,
    message: String(message).slice(0, MAXIMUM_REPORTED_MESSAGE_LENGTH),
    stack: stack ? String(stack).slice(0, MAXIMUM_REPORTED_STACK_LENGTH) : undefined,
    url: truncateOptionalText(url, MAXIMUM_REPORTED_URL_LENGTH),
    userAgent: truncateOptionalText(userAgent, MAXIMUM_REPORTED_USER_AGENT_LENGTH),
    origin,
    context: limitReportedContext(context),
  };
}
