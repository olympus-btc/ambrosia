export function buildSaleItemKey(saleItem) {
  return `${saleItem.orderId}-${saleItem.productName}-${saleItem.variantId ?? ""}`;
}
