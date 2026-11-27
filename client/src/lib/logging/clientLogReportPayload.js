import { LOG_LEVEL_ERROR } from "@/lib/logs";

export const CLIENT_LOG_REPORT_ORIGIN_BROWSER = "browser";
export const CLIENT_LOG_REPORT_ORIGIN_NEXT_SERVER = "next-server";
export const MAXIMUM_REPORTED_ERROR_MESSAGE_LENGTH = 2000;
export const MAXIMUM_REPORTED_STACK_TRACE_LENGTH = 8000;
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
      errorMessage: reportedErrorOrReason.message || reportedErrorOrReason.name,
      stackTrace: reportedErrorOrReason.stack,
    };
  }
  if (typeof reportedErrorOrReason === "string") return { errorMessage: reportedErrorOrReason, stackTrace: undefined };
  try {
    return { errorMessage: JSON.stringify(reportedErrorOrReason), stackTrace: undefined };
  } catch {
    return { errorMessage: String(reportedErrorOrReason), stackTrace: undefined };
  }
}

export function buildClientLogReportPayload({
  level = LOG_LEVEL_ERROR,
  errorMessage,
  stackTrace,
  url,
  userAgent,
  origin,
  context = {},
}) {
  return {
    level,
    errorMessage: String(errorMessage).slice(0, MAXIMUM_REPORTED_ERROR_MESSAGE_LENGTH),
    stackTrace: stackTrace ? String(stackTrace).slice(0, MAXIMUM_REPORTED_STACK_TRACE_LENGTH) : undefined,
    url: truncateOptionalText(url, MAXIMUM_REPORTED_URL_LENGTH),
    userAgent: truncateOptionalText(userAgent, MAXIMUM_REPORTED_USER_AGENT_LENGTH),
    origin,
    context: limitReportedContext(context),
  };
}
