"use client";

import QRCode from "react-qr-code";

import { resolveTemplateVariables } from "./resolveTemplateVariables";
import { sampleTicket } from "./sampleData";

const qrWidthClasses = {
  NORMAL: "w-[28%]",
  LARGE: "w-[42%]",
  EXTRA_LARGE: "w-[56%]",
};

const qrAlignmentClasses = {
  LEFT: "items-start",
  CENTER: "items-center",
  RIGHT: "items-end",
};

export function ElementQrCode({ templateText, businessConfig, printFormats, fontSize, justification, className }) {
  const qrContent = resolveTemplateVariables(templateText || "", businessConfig, printFormats) || sampleTicket.invoice;
  const widthClass = qrWidthClasses[fontSize] || qrWidthClasses.NORMAL;
  const alignmentClass = qrAlignmentClasses[justification] || qrAlignmentClasses.LEFT;

  return (
    <div className={`flex flex-col gap-2 ${alignmentClass} ${className}`}>
      <div className={widthClass} data-testid="qr-preview">
        <QRCode value={qrContent} size={256} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
      </div>
      <span className="break-all text-xs text-gray-500">{qrContent}</span>
    </div>
  );
}
