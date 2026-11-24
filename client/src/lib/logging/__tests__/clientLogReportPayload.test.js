import {
  buildClientLogReportPayload,
  CLIENT_LOG_REPORT_ORIGIN_NEXT_SERVER,
  MAXIMUM_REPORTED_CONTEXT_ENTRIES,
  MAXIMUM_REPORTED_CONTEXT_KEY_LENGTH,
  MAXIMUM_REPORTED_CONTEXT_VALUE_LENGTH,
  MAXIMUM_REPORTED_ERROR_MESSAGE_LENGTH,
  MAXIMUM_REPORTED_STACK_TRACE_LENGTH,
  MAXIMUM_REPORTED_URL_LENGTH,
  MAXIMUM_REPORTED_USER_AGENT_LENGTH,
  normalizeReportedError,
} from "../clientLogReportPayload";

describe("clientLogReportPayload", () => {
  describe("normalizeReportedError", () => {
    it("normalizes errors, strings and objects", () => {
      const thrownError = new Error("boom");

      expect(normalizeReportedError(thrownError)).toEqual({ errorMessage: "boom", stackTrace: thrownError.stack });
      expect(normalizeReportedError("plain text")).toEqual({ errorMessage: "plain text", stackTrace: undefined });
      expect(normalizeReportedError({ code: 7 })).toEqual({ errorMessage: "{\"code\":7}", stackTrace: undefined });
    });
  });

  describe("buildClientLogReportPayload", () => {
    it("defaults the level to ERROR and truncates long error message and stack trace", () => {
      const clientLogReportPayload = buildClientLogReportPayload({
        errorMessage: "m".repeat(MAXIMUM_REPORTED_ERROR_MESSAGE_LENGTH + 10),
        stackTrace: "s".repeat(MAXIMUM_REPORTED_STACK_TRACE_LENGTH + 10),
        url: "/api/products",
        origin: CLIENT_LOG_REPORT_ORIGIN_NEXT_SERVER,
      });

      expect(clientLogReportPayload.level).toBe("ERROR");
      expect(clientLogReportPayload.errorMessage).toHaveLength(MAXIMUM_REPORTED_ERROR_MESSAGE_LENGTH);
      expect(clientLogReportPayload.stackTrace).toHaveLength(MAXIMUM_REPORTED_STACK_TRACE_LENGTH);
      expect(clientLogReportPayload.origin).toBe("next-server");
      expect(clientLogReportPayload.context).toEqual({});
    });

    it("omits the stack trace when none is given", () => {
      expect(buildClientLogReportPayload({ errorMessage: "no stack trace" }).stackTrace).toBeUndefined();
    });

    it("keeps url, user agent and context within the limits the server accepts", () => {
      const oversizedContext = Object.fromEntries(
        Array.from({ length: MAXIMUM_REPORTED_CONTEXT_ENTRIES + 5 }, (_, contextIndex) => [
          `${contextIndex}${"k".repeat(MAXIMUM_REPORTED_CONTEXT_KEY_LENGTH)}`,
          "v".repeat(MAXIMUM_REPORTED_CONTEXT_VALUE_LENGTH + 10),
        ]),
      );

      const clientLogReportPayload = buildClientLogReportPayload({
        errorMessage: "render failed",
        url: `/store/${"u".repeat(MAXIMUM_REPORTED_URL_LENGTH)}`,
        userAgent: "a".repeat(MAXIMUM_REPORTED_USER_AGENT_LENGTH + 10),
        context: oversizedContext,
      });

      expect(clientLogReportPayload.url).toHaveLength(MAXIMUM_REPORTED_URL_LENGTH);
      expect(clientLogReportPayload.userAgent).toHaveLength(MAXIMUM_REPORTED_USER_AGENT_LENGTH);
      const reportedContextEntries = Object.entries(clientLogReportPayload.context);
      expect(reportedContextEntries).toHaveLength(MAXIMUM_REPORTED_CONTEXT_ENTRIES);
      reportedContextEntries.forEach(([contextKey, contextValue]) => {
        expect(contextKey.length).toBeLessThanOrEqual(MAXIMUM_REPORTED_CONTEXT_KEY_LENGTH);
        expect(contextValue).toHaveLength(MAXIMUM_REPORTED_CONTEXT_VALUE_LENGTH);
      });
    });

    it("leaves url and user agent out when they are not provided", () => {
      const clientLogReportPayload = buildClientLogReportPayload({ errorMessage: "render failed" });

      expect(clientLogReportPayload.url).toBeUndefined();
      expect(clientLogReportPayload.userAgent).toBeUndefined();
    });
  });
});
