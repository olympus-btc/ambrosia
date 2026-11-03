export function ensureCartReady({
  items,
  selectedPaymentMethod,
  userId,
  currencyId,
}) {
  if (!selectedPaymentMethod) {
    throw new Error("errors.selectMethod");
  }

  if (!items.length) {
    throw new Error("errors.emptyCart");
  }

  if (!userId) {
    throw new Error("errors.noUser");
  }

  if (!currencyId) {
    throw new Error("errors.noCurrency");
  }
}

export function normalizeAmounts({
  subtotal,
  discount,
  discountAmount,
  tipAmount = 0,
  total,
  formatAmount,
}) {
  return {
    subtotal,
    discount,
    discountAmount,
    tipAmount,
    total,
    amountFiat: total / 100,
    tipAmountFiat: tipAmount / 100,
    displayTotal: formatAmount(total),
  };
}
