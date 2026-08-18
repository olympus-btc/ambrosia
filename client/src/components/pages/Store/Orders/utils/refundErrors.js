export const REFUND_ERROR_TRANSLATIONS = {
  order_not_paid: "details.refundErrors.orderNotPaid",
  no_bitcoin_payment: "details.refundErrors.noBitcoinPayment",
  refund_invoice_missing_amount: "details.refundErrors.refundInvoiceMissingAmount",
  refund_invoice_amount_mismatch: "details.refundErrors.refundInvoiceAmountMismatch",
  already_refunded: "details.refundErrors.alreadyRefunded",
};

export function getRefundErrorDescription(translate, refundError) {
  const translationKey = REFUND_ERROR_TRANSLATIONS[refundError?.code];

  if (translationKey) {
    return translate(translationKey);
  }

  if (refundError?.responseMessage) {
    return refundError.responseMessage;
  }

  if (refundError?.message) {
    return refundError.message;
  }

  return translate("details.refundErrors.unknown");
}
