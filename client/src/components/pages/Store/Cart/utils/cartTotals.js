export function calculateCartTotals(items, discount) {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = (subtotal * (Number(discount) || 0)) / 100;
  return { subtotal, discountAmount, total: subtotal - discountAmount };
}
