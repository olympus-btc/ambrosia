export function calculateCartTotals(items, discountValue, discountType = "percentage") {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount =
    discountType === "fixed"
      ? (Number(discountValue) || 0) * 100
      : (subtotal * (Number(discountValue) || 0)) / 100;
  return { subtotal, discountAmount, total: subtotal - discountAmount };
}
