import { isStockTracked } from "./productStockStatus";

export function variantIsActive(variant) {
  return variant.isActive !== false;
}

export function variantIsAvailableForSale(variant, product) {
  return variantIsActive(variant) && (!isStockTracked(product ?? {}) || variant.quantity > 0);
}
