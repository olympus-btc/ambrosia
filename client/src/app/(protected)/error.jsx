"use client";

import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { useReportRenderError } from "@/hooks/useReportRenderError";

export default function ProtectedSegmentError({ error: renderError, reset: retryRender }) {
  useReportRenderError(renderError, "react.errorBoundary");

  return <ErrorFallback onRetry={retryRender} />;
}
