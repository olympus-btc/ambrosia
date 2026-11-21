import { renderHook } from "@testing-library/react";

import { reportClientError } from "@/lib/logging/reportClientError";

import { useReportRenderError } from "../useReportRenderError";

jest.mock("@/lib/logging/reportClientError", () => ({
  reportClientError: jest.fn(),
}));

describe("useReportRenderError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports the render error with the boundary type and digest", () => {
    const renderError = new Error("Cannot render cart");
    renderError.digest = "digest-123";

    renderHook(() => useReportRenderError(renderError, "react.errorBoundary"));

    expect(reportClientError).toHaveBeenCalledWith({
      message: "Cannot render cart",
      stack: renderError.stack,
      context: { type: "react.errorBoundary", digest: "digest-123" },
    });
  });

  it("omits the digest when the error does not have one", () => {
    renderHook(() => useReportRenderError(new Error("Layout crashed"), "react.globalError"));

    expect(reportClientError).toHaveBeenCalledWith(expect.objectContaining({
      context: { type: "react.globalError" },
    }));
  });
});
