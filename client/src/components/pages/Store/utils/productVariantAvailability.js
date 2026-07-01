export function variantIsActive(variant) {
  return variant.isActive !== false;
}

export function variantIsAvailableForSale(variant) {
  return variantIsActive(variant) && variant.quantity > 0;
}
