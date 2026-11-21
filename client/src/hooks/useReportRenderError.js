"use client";

import { useEffect } from "react";

import { normalizeReportedError } from "@/lib/logging/clientLogReportPayload";
import { reportClientError } from "@/lib/logging/reportClientError";

export function useReportRenderError(renderError, errorBoundaryType) {
  useEffect(() => {
    const { message, stack } = normalizeReportedError(renderError);
    reportClientError({
      message,
      stack,
      context: {
        type: errorBoundaryType,
        ...(renderError?.digest ? { digest: renderError.digest } : {}),
      },
    });
  }, [renderError, errorBoundaryType]);
}
