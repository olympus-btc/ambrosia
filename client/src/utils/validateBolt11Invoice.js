export const BOLT11_VALIDATION_ERROR = {
  EMPTY: "empty",
  INVALID_FORMAT: "invalid_format",
};

const VALID_INVOICE_PREFIXES = ["lnbc", "lntb", "lnbcrt"];
const MIN_INVOICE_LENGTH = 20;

export function getBolt11ValidationErrorCode(invoiceValue) {
  if (!invoiceValue || !invoiceValue.trim()) {
    return BOLT11_VALIDATION_ERROR.EMPTY;
  }

  const trimmedInvoice = invoiceValue.trim().toLowerCase();
  const hasValidPrefix = VALID_INVOICE_PREFIXES.some((prefix) => trimmedInvoice.startsWith(prefix));

  if (!hasValidPrefix || trimmedInvoice.length < MIN_INVOICE_LENGTH) {
    return BOLT11_VALIDATION_ERROR.INVALID_FORMAT;
  }

  return "";
}
