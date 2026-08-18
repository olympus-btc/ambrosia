import { toArray } from "@/components/utils/array";

import { normalizeSku } from "./normalizeSku";

const toFiniteNumber = (value) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

export const buildRequestPayload = (product, imageUrl, { includeId = false } = {}) => {
  const priceCents = Math.round(toFiniteNumber(product.productPrice) * 100);
  const isBundle = product.isBundle ?? false;
  const hasVariants = isBundle ? false : (product.hasVariants ?? false);
  const tracksStock = isBundle ? true : (product.trackStock ?? true);

  return {
    ...(includeId ? { id: product.productId } : {}),
    SKU: normalizeSku(product.productSKU),
    name: product.productName,
    description: product.productDescription || null,
    imageUrl,
    costCents: priceCents,
    categoryIds: toArray(product.productCategories),
    quantity: isBundle || !tracksStock ? 0 : toFiniteNumber(product.productStock),
    minStockThreshold: tracksStock ? toFiniteNumber(product.productMinStock) : 0,
    maxStockThreshold: tracksStock ? toFiniteNumber(product.productMaxStock) : 0,
    hasVariants,
    trackStock: tracksStock,
    priceCents,
    isBundle,
    bundleComponents: isBundle
      ? (product.bundleComponents ?? []).map((bundleProduct) => ({
          componentId: bundleProduct.productId,
          variantId: bundleProduct.variantId ?? null,
          quantity: bundleProduct.quantity,
        }))
      : [],
  };
};
