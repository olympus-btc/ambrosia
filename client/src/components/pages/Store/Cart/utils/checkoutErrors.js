export const CHECKOUT_ERROR_TRANSLATIONS = {
  checkout_empty: "errors.checkoutEmpty",
  checkout_invalid_quantity: "errors.checkoutInvalidQuantity",
  checkout_invalid_reference: "errors.checkoutInvalidReference",
  checkout_product_not_found: "errors.checkoutProductNotFound",
  checkout_variant_not_found: "errors.checkoutVariantNotFound",
  checkout_insufficient_stock: "errors.checkoutInsufficientStock",
};

export function getCheckoutErrorDescription(checkoutError, fallbackKey) {
  return (
    CHECKOUT_ERROR_TRANSLATIONS[checkoutError?.code] ||
    checkoutError?.responseMessage ||
    checkoutError?.message ||
    fallbackKey
  );
}
