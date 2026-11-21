"use client";

import "./globals.css";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { useReportRenderError } from "@/hooks/useReportRenderError";
import { I18nProvider } from "@/i18n/I18nProvider";

export default function GlobalError({ error: renderError, reset: retryRender }) {
  useReportRenderError(renderError, "react.globalError");

  return (
    <html lang="en">
      <body className="antialiased">
        <I18nProvider>
          <ErrorFallback onRetry={retryRender} />
        </I18nProvider>
      </body>
    </html>
  );
}
