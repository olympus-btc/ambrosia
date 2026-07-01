import { toArray } from "@/components/utils/array";

import { normalizeSku } from "./normalizeSku";

const toFiniteNumber = (value) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

export const buildRequestPayload = (product, imageUrl, { includeId = false } = {}) => {
  const priceCents = Math.round(toFiniteNumber(product.productPrice) * 100);

  return {
    ...(includeId ? { id: product.productId } : {}),
    SKU: normalizeSku(product.productSKU),
    name: product.productName,
    description: product.productDescription || null,
    imageUrl,
    costCents: priceCents,
    categoryIds: toArray(product.productCategories),
    quantity: toFiniteNumber(product.productStock),
    minStockThreshold: toFiniteNumber(product.productMinStock),
    maxStockThreshold: toFiniteNumber(product.productMaxStock),
    priceCents,
    isBundle: product.isBundle ?? false,
    bundleComponents: product.isBundle
      ? (product.bundleComponents ?? []).map((bundleProduct) => ({
          componentId: bundleProduct.productId,
          quantity: bundleProduct.quantity,
        }))
      : [],
  };
};
