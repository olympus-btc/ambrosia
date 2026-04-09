export function ensureCartReady({
  t,
  items,
  selectedPaymentMethod,
  userId,
  currencyId,
}) {
  if (!selectedPaymentMethod) {
    throw new Error(t("errors.selectMethod"));
  }

  if (!items.length) {
    throw new Error(t("errors.emptyCart"));
  }

  if (!userId) {
    throw new Error(t("errors.noUser"));
  }

  if (!currencyId) {
    throw new Error(t("errors.noCurrency"));
  }
}

export function normalizeAmounts({
  subtotal,
  discount,
  discountAmount,
  total,
  formatAmount,
}) {
  return {
    subtotal,
    discount,
    discountAmount,
    total,
    amountFiat: total / 100,
    displayTotal: formatAmount(total),
  };
}
