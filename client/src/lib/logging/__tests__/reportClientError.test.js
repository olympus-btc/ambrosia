import { httpWrapper } from "@/lib/http/httpWrapper";

import {
  MAXIMUM_REPORTS_PER_MINUTE,
  reportClientError,
  resetClientErrorReportingState,
  shouldSendClientLogReport,
} from "../reportClientError";

jest.mock("@/lib/http/httpWrapper", () => ({
  httpWrapper: jest.fn().mockResolvedValue({ ok: true, status: 204 }),
}));

describe("reportClientError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetClientErrorReportingState();
  });

  it("posts the report with the current pathname and browser origin", async () => {
    await reportClientError({ errorMessage: "Cart crashed", stackTrace: "TypeError: x", context: { type: "window.error" } });

    expect(httpWrapper).toHaveBeenCalledWith(
      "/logs/client",
      expect.objectContaining({ method: "POST", keepalive: true }),
    );
    const reportBody = JSON.parse(httpWrapper.mock.calls[0][1].body);
    expect(reportBody).toEqual(expect.objectContaining({
      level: "ERROR",
      errorMessage: "Cart crashed",
      stackTrace: "TypeError: x",
      url: window.location.pathname,
      origin: "browser",
      context: { type: "window.error" },
    }));
  });

  it("does not send the same error twice within the duplicate window", async () => {
    await reportClientError({ errorMessage: "Same error" });
    await reportClientError({ errorMessage: "Same error" });

    expect(httpWrapper).toHaveBeenCalledTimes(1);
  });

  it("does not send reports without an error message", async () => {
    await reportClientError({ errorMessage: "" });

    expect(httpWrapper).not.toHaveBeenCalled();
  });

  it("never throws when the report request fails", async () => {
    httpWrapper.mockRejectedValueOnce(new Error("offline"));

    await expect(reportClientError({ errorMessage: "Offline error" })).resolves.toBeUndefined();
  });

  it("limits how many reports are sent per minute", () => {
    const currentTimestamp = 1_000_000;
    const reportSendDecisions = Array.from(
      { length: MAXIMUM_REPORTS_PER_MINUTE + 1 },
      (_, reportPosition) => shouldSendClientLogReport(`signature-${reportPosition}`, currentTimestamp),
    );

    expect(reportSendDecisions.filter(Boolean)).toHaveLength(MAXIMUM_REPORTS_PER_MINUTE);
    expect(reportSendDecisions[MAXIMUM_REPORTS_PER_MINUTE]).toBe(false);
    expect(shouldSendClientLogReport("signature-after-a-minute", currentTimestamp + 60_001)).toBe(true);
  });
});
