const PAYMENT_ERROR_TRANSLATION_KEYS = {
  invoice_already_paid: "payments.send.errors.invoiceAlreadyPaid",
  invoice_expired: "payments.send.errors.invoiceExpired",
  recipient_rejected_payment: "payments.send.errors.recipientRejectedPayment",
  invalid_invoice: "payments.send.errors.invalidInvoice",
  insufficient_funds: "payments.send.errors.insufficientFunds",
  node_unavailable: "payments.send.errors.nodeUnavailable",
  invalid_payment_response: "payments.send.errors.unknown",
};

export function getPaymentErrorDescription(translate, paymentError) {
  const translationKey = PAYMENT_ERROR_TRANSLATION_KEYS[paymentError?.code];

  if (translationKey) {
    return translate(translationKey);
  }

  if (paymentError?.message) {
    return paymentError.message;
  }

  return translate("payments.send.errors.unknown");
}
