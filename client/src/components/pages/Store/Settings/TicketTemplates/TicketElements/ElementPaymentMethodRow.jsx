"use client";

import { removeAccents } from "./removeAccents";
import { resolveTemplateVariables } from "./resolveTemplateVariables";

export function ElementPaymentMethodRow({ templateText, businessConfig, printFormats, sampleTicket, className }) {
  const paymentMethodLabel = resolveTemplateVariables(templateText || "", businessConfig, printFormats).trim() || sampleTicket.labels.paymentMethod;
  return (
    <div className={`flex justify-between gap-3 ${className}`}>
      <span>{removeAccents(paymentMethodLabel)}</span>
      <span className="whitespace-nowrap">{removeAccents(sampleTicket.paymentMethod)}</span>
    </div>
  );
}
