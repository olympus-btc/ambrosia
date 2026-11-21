import { renderHook, waitFor } from "@testing-library/react";

import { getLogSources } from "@/services/logsService";

import { useLogSources } from "../useLogSources";

jest.mock("@/services/logsService", () => ({
  getLogSources: jest.fn(),
}));

describe("useLogSources", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads the sources and reports which ones are available", async () => {
    getLogSources.mockResolvedValueOnce([
      { id: "server", available: true },
      { id: "phoenixd", available: false, unavailableReason: "remote_lightning_backend" },
    ]);
    const renderedLogSourcesHook = renderHook(() => useLogSources());

    await waitFor(() => expect(renderedLogSourcesHook.result.current.logSources).toHaveLength(2));

    expect(getLogSources).toHaveBeenCalled();
    expect(renderedLogSourcesHook.result.current.isLogSourceAvailable("server")).toBe(true);
    expect(renderedLogSourcesHook.result.current.isLogSourceAvailable("phoenixd")).toBe(false);
    expect(renderedLogSourcesHook.result.current.findLogSourceAvailability("phoenixd").unavailableReason)
      .toBe("remote_lightning_backend");
  });

  it("treats phoenixd as unavailable until the server confirms it", () => {
    getLogSources.mockReturnValueOnce(new Promise(() => {}));
    const renderedLogSourcesHook = renderHook(() => useLogSources());

    expect(renderedLogSourcesHook.result.current.isLogSourceAvailable("phoenixd")).toBe(false);
    expect(renderedLogSourcesHook.result.current.isLogSourceAvailable("server")).toBe(true);
  });

  it("keeps the error when the sources cannot be loaded", async () => {
    const logSourcesRequestError = new Error("forbidden");
    getLogSources.mockRejectedValueOnce(logSourcesRequestError);
    const renderedLogSourcesHook = renderHook(() => useLogSources());

    await waitFor(() => expect(renderedLogSourcesHook.result.current.logSourcesError).toBe(logSourcesRequestError));
  });
});
