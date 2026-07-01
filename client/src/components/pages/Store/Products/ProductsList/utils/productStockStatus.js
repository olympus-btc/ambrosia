import { toFiniteNumber } from "@/components/utils/numberParsers";

export const PRODUCT_STOCK_STATUS = {
  OUT: "out",
  LOW: "low",
  OK: "ok",
};

export function getProductStockQuantity(product) {
  return toFiniteNumber(product.quantity ?? product.productStock);
}

export function getProductStockStatus(product) {
  const productStockQuantity = getProductStockQuantity(product);
  const productMinimumStockThreshold = toFiniteNumber(product.minStockThreshold);

  if (productStockQuantity <= 0) return PRODUCT_STOCK_STATUS.OUT;
  if (productStockQuantity <= productMinimumStockThreshold) return PRODUCT_STOCK_STATUS.LOW;
  return PRODUCT_STOCK_STATUS.OK;
}

export function getStockChipClassName(stockStatus) {
  if (stockStatus === PRODUCT_STOCK_STATUS.OUT) {
    return "bg-rose-100 text-rose-800 border border-rose-200 text-xs";
  }

  if (stockStatus === PRODUCT_STOCK_STATUS.LOW) {
    return "bg-amber-100 text-amber-800 border border-amber-200 text-xs";
  }

  return "bg-green-200 text-green-800 border border-green-300 text-xs";
}
