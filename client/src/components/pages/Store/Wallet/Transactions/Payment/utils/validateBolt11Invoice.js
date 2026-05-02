export function getBolt11ValidationError(invoiceValue, t) {
  if (!invoiceValue || !invoiceValue.trim()) {
    return t("payments.send.noInvoiceToPay");
  }

  const trimmedInvoice = invoiceValue.trim().toLowerCase();
  const validPrefixes = ["lnbc", "lntb", "lnbcrt"];
  const hasValidPrefix = validPrefixes.some((prefix) => trimmedInvoice.startsWith(prefix));

  if (!hasValidPrefix) {
    return t("payments.send.invalidInvoiceFormat");
  }

  if (trimmedInvoice.length < 20) {
    return t("payments.send.invalidInvoiceFormat");
  }

  return "";
}
