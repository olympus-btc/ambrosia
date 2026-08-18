import { toFiniteNumber } from "@/components/utils/numberParsers";

export const PRODUCT_STOCK_STATUS = {
  OUT: "out",
  LOW: "low",
  OK: "ok",
  UNTRACKED: "untracked",
};

export const DEFAULT_LOW_STOCK_THRESHOLD = 11;

export const UNTRACKED_STOCK_LIMIT = Number.MAX_SAFE_INTEGER;

export function isStockTracked(product) {
  return product?.trackStock !== false;
}

export function getProductStockQuantity(product) {
  return toFiniteNumber(product.quantity ?? product.productStock);
}

export function getProductStockStatus(product) {
  if (!isStockTracked(product)) return PRODUCT_STOCK_STATUS.UNTRACKED;

  const productStockQuantity = getProductStockQuantity(product);

  if (productStockQuantity <= 0) return PRODUCT_STOCK_STATUS.OUT;
  if (productStockQuantity < DEFAULT_LOW_STOCK_THRESHOLD) return PRODUCT_STOCK_STATUS.LOW;
  return PRODUCT_STOCK_STATUS.OK;
}

export function getStockChipClassName(stockStatus) {
  if (stockStatus === PRODUCT_STOCK_STATUS.UNTRACKED) {
    return "bg-gray-100 text-gray-700 border border-gray-200 text-xs";
  }

  if (stockStatus === PRODUCT_STOCK_STATUS.OUT) {
    return "bg-rose-100 text-rose-800 border border-rose-200 text-xs";
  }

  if (stockStatus === PRODUCT_STOCK_STATUS.LOW) {
    return "bg-amber-100 text-amber-800 border border-amber-200 text-xs";
  }

  return "bg-green-200 text-green-800 border border-green-300 text-xs";
}
