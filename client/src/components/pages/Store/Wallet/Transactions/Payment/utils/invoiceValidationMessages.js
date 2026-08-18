import { BOLT11_VALIDATION_ERROR } from "@/utils/validateBolt11Invoice";

const INVOICE_VALIDATION_TRANSLATIONS = {
  [BOLT11_VALIDATION_ERROR.EMPTY]: "payments.send.noInvoiceToPay",
  [BOLT11_VALIDATION_ERROR.INVALID_FORMAT]: "payments.send.invalidInvoiceFormat",
};

export function getInvoiceValidationMessage(translate, errorCode) {
  const translationKey = INVOICE_VALIDATION_TRANSLATIONS[errorCode];
  return translationKey ? translate(translationKey) : "";
}
