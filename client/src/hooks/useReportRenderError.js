"use client";

import { useEffect } from "react";

import { normalizeReportedError } from "@/lib/logging/clientLogReportPayload";
import { reportClientError } from "@/lib/logging/reportClientError";

export function useReportRenderError(renderError, errorBoundaryType) {
  useEffect(() => {
    const { errorMessage, stackTrace } = normalizeReportedError(renderError);
    reportClientError({
      errorMessage,
      stackTrace,
      context: {
        type: errorBoundaryType,
        ...(renderError?.digest ? { digest: renderError.digest } : {}),
      },
    });
  }, [renderError, errorBoundaryType]);
}
