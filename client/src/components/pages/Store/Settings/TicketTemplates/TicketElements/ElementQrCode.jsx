"use client";

import { resolveValue } from "./resolveValue";
import { sampleTicket } from "./sampleData";

export function ElementQrCode({ value, config, className }) {
  const qrValue = resolveValue(value || "", config) || sampleTicket.invoice;
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="flex h-28 w-28 items-center justify-center rounded-md border-2 border-dashed border-gray-400 text-xs text-gray-500">
        QR
      </div>
      <span className="text-xs text-gray-500">{qrValue}</span>
    </div>
  );
}
