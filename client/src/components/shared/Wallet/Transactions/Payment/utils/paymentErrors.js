import { isSecretsLockedError } from "@/services/walletService";

export const PAYMENT_ERROR_TRANSLATIONS = {
  invoice_already_paid: "payments.send.errors.invoiceAlreadyPaid",
  invoice_expired: "payments.send.errors.invoiceExpired",
  recipient_rejected_payment: "payments.send.errors.recipientRejectedPayment",
  invalid_invoice: "payments.send.errors.invalidInvoice",
  missing_amount: "payments.send.errors.missingAmount",
  insufficient_funds: "payments.send.errors.insufficientFunds",
  fee_or_cltv: "payments.send.errors.feeOrCltv",
  remote_liquidity: "payments.send.errors.remoteLiquidity",
  node_unavailable: "payments.send.errors.nodeUnavailable",
  amount_override_not_supported: "payments.send.errors.amountOverrideNotSupported",
  invalid_payment_response: "payments.send.errors.unknown",
};

const PAYMENT_CATEGORY_TRANSLATIONS = {
  remote_routing: "payments.send.errors.remoteRouting",
  remote_liquidity: "payments.send.errors.remoteLiquidity",
  fee_or_cltv: "payments.send.errors.feeOrCltv",
  temporary_backend: "payments.send.errors.temporaryBackend",
};

const PAYMENT_CATEGORY_BY_CODE = {
  invoice_already_paid: "local_validation",
  invoice_expired: "local_validation",
  invalid_invoice: "local_validation",
  missing_amount: "local_validation",
  amount_override_not_supported: "local_validation",
  insufficient_funds: "local_wallet_state",
  recipient_rejected_payment: "remote_routing",
  remote_liquidity: "remote_liquidity",
  fee_or_cltv: "fee_or_cltv",
  node_unavailable: "temporary_backend",
};

const RETRYABLE_PAYMENT_CATEGORIES = new Set([
  "remote_routing",
  "remote_liquidity",
  "fee_or_cltv",
  "temporary_backend",
  "unknown",
]);

function getPaymentErrorCategory(paymentError) {
  if (paymentError?.category && paymentError.category !== "unknown") {
    return paymentError.category;
  }

  return PAYMENT_CATEGORY_BY_CODE[paymentError?.code] ?? "unknown";
}

export function getPaymentErrorDescription(translate, paymentError) {
  if (isSecretsLockedError(paymentError)) {
    return translate("payments.send.errors.secretsLocked");
  }

  const paymentErrorCategory = getPaymentErrorCategory(paymentError);
  const translationKey = PAYMENT_ERROR_TRANSLATIONS[paymentError?.code];

  let paymentErrorDescription;
  if (translationKey) {
    paymentErrorDescription = translate(translationKey);
  } else if (PAYMENT_CATEGORY_TRANSLATIONS[paymentErrorCategory]) {
    paymentErrorDescription = translate(PAYMENT_CATEGORY_TRANSLATIONS[paymentErrorCategory]);
  } else if (paymentError?.message) {
    paymentErrorDescription = paymentError.message;
  } else {
    paymentErrorDescription = translate("payments.send.errors.unknown");
  }

  if (RETRYABLE_PAYMENT_CATEGORIES.has(paymentErrorCategory)) {
    return `${paymentErrorDescription} ${translate("payments.send.errors.retryGuidance")}`;
  }

  return paymentErrorDescription;
}
