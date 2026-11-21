"use client";

import { useEffect } from "react";

import { useAuth } from "@/hooks/auth/useAuth";
import { normalizeReportedError } from "@/lib/logging/clientLogReportPayload";
import { reportClientError } from "@/lib/logging/reportClientError";

export default function ClientErrorReporter() {
  const { isAuth } = useAuth();

  useEffect(() => {
    if (!isAuth) return undefined;

    const handleWindowError = (errorEvent) => {
      const { message, stack } = normalizeReportedError(errorEvent.error ?? errorEvent.message);
      reportClientError({
        message,
        stack,
        context: {
          type: "window.error",
          ...(errorEvent.filename ? { file: `${errorEvent.filename}:${errorEvent.lineno}:${errorEvent.colno}` } : {}),
        },
      });
    };

    const handleUnhandledRejection = (rejectionEvent) => {
      const { message, stack } = normalizeReportedError(rejectionEvent.reason);
      reportClientError({ message, stack, context: { type: "unhandledrejection" } });
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [isAuth]);

  return null;
}
