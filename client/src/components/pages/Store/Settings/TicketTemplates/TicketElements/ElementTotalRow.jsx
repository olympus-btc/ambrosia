"use client";

import { resolveValue } from "./resolveValue";
import { sampleTicket } from "./sampleData";

export function ElementTotalRow({ localId, value, config, className }) {
  const label = resolveValue(value || "", config).trim() || "TOTAL";
  return [
    <div key={`${localId}-total-sep`} className="border-t border-gray-400 my-2" />,
    <div
      key={`${localId}-total`}
      className={`flex justify-between gap-3 ${className}`}
    >
      <span className="font-semibold">{label}</span>
      <span className="whitespace-nowrap font-semibold">{sampleTicket.total}</span>
    </div>,
  ];
}
