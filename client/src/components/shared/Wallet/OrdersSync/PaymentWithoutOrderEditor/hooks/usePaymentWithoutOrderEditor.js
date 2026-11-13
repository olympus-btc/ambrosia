"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  addCartItem,
  removeCartItem,
  setCartItemQuantity,
} from "@/components/pages/Store/Cart/utils/cartItemOperations";
import { useProductVariants } from "@/components/pages/Store/hooks/useProductVariants";
import {
  getProductStockQuantity,
  isStockTracked,
  UNTRACKED_STOCK_LIMIT,
} from "@/components/pages/Store/utils/productStockStatus";
import { deriveVariantDisplayName } from "@/components/pages/Store/utils/productVariantOptionValues";
import BitcoinPriceService from "@/services/bitcoinPriceService";
import { confirmPaymentWithoutOrder } from "@/services/ordersSyncService";

const bitcoinPriceService = new BitcoinPriceService();
const SATOSHIS_PER_BTC = 100_000_000;

function formatEpochMillisAsDDMMYYYY(epochMillis) {
  const completedAtDate = new Date(epochMillis);
  const day = String(completedAtDate.getUTCDate()).padStart(2, "0");
  const month = String(completedAtDate.getUTCMonth() + 1).padStart(2, "0");
  const year = completedAtDate.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function getAvailableQuantity(product, variant) {
  if (!isStockTracked(product)) return UNTRACKED_STOCK_LIMIT;
  if (variant) return Number(variant.quantity) || 0;
  return getProductStockQuantity(product);
}

function buildResolvedCartItem(product, variant, variantName, desiredQuantity) {
  const availableQuantity = getAvailableQuantity(product, variant);
  const [cartItemWithDefaultQuantity] = addCartItem([], product, variant, availableQuantity, variantName);
  const [cartItemWithDesiredQuantity] = setCartItemQuantity(
    [cartItemWithDefaultQuantity],
    cartItemWithDefaultQuantity.id,
    desiredQuantity,
    availableQuantity,
  );
  return cartItemWithDesiredQuantity;
}

function removePurchasedItemFromUnresolved(unresolvedPurchasedItems, purchasedItemToRemove) {
  return unresolvedPurchasedItems.filter((candidatePurchasedItem) => candidatePurchasedItem !== purchasedItemToRemove);
}

async function autoResolvePurchasedItem(purchasedItem, products, fetchProductDetail) {
  const matchedProduct = products.find(
    (product) => product.name.toLowerCase() === purchasedItem.name.toLowerCase(),
  );
  if (!matchedProduct) return null;

  if (!matchedProduct.hasVariants) {
    return buildResolvedCartItem(matchedProduct, null, null, purchasedItem.quantity);
  }

  const productDetail = await fetchProductDetail(matchedProduct.id);
  const firstActiveVariant = productDetail?.variants?.find((variant) => variant.isActive) ?? null;
  if (!firstActiveVariant) return null;

  const variantName = deriveVariantDisplayName(firstActiveVariant.optionValueIds, productDetail.options);
  return buildResolvedCartItem(matchedProduct, firstActiveVariant, variantName, purchasedItem.quantity);
}

export function usePaymentWithoutOrderEditor({
  payment,
  products,
  currencyAcronym,
  currencyId,
  paymentMethodId,
  userId,
}) {
  const { fetchProductDetail } = useProductVariants();
  const productsRef = useRef(products);
  const fetchProductDetailRef = useRef(fetchProductDetail);
  useEffect(() => {
    productsRef.current = products;
    fetchProductDetailRef.current = fetchProductDetail;
  });

  const [resolvedItems, setResolvedItems] = useState([]);
  const [unresolvedPurchasedItems, setUnresolvedPurchasedItems] = useState(payment.purchasedItems);
  const [isAutoResolving, setIsAutoResolving] = useState(true);
  const [historicalPrice, setHistoricalPrice] = useState(null);
  const [historicalPriceError, setHistoricalPriceError] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmPaymentError, setConfirmPaymentError] = useState(null);

  useEffect(() => {
    let autoResolutionIsCancelled = false;

    async function autoResolveEveryPurchasedItem() {
      setIsAutoResolving(true);
      const autoResolvedItems = [];
      const stillUnresolvedPurchasedItems = [];

      for (const purchasedItem of payment.purchasedItems) {
        const autoResolvedItem = await autoResolvePurchasedItem(
          purchasedItem,
          productsRef.current,
          fetchProductDetailRef.current,
        );
        if (autoResolvedItem) {
          autoResolvedItems.push(autoResolvedItem);
        } else {
          stillUnresolvedPurchasedItems.push(purchasedItem);
        }
      }

      if (autoResolutionIsCancelled) return;
      setResolvedItems(autoResolvedItems);
      setUnresolvedPurchasedItems(stillUnresolvedPurchasedItems);
      setIsAutoResolving(false);
    }

    autoResolveEveryPurchasedItem();

    return () => {
      autoResolutionIsCancelled = true;
    };
  }, [payment]);

  useEffect(() => {
    let historicalPriceRequestIsCancelled = false;

    async function loadHistoricalPrice() {
      try {
        const completedAtDateDDMMYYYY = formatEpochMillisAsDDMMYYYY(payment.completedAt);
        const resolvedHistoricalPrice = await bitcoinPriceService.getHistoricalBitcoinPrice(
          completedAtDateDDMMYYYY,
          currencyAcronym,
        );
        if (!historicalPriceRequestIsCancelled) setHistoricalPrice(resolvedHistoricalPrice);
      } catch (loadHistoricalPriceError) {
        if (!historicalPriceRequestIsCancelled) setHistoricalPriceError(loadHistoricalPriceError);
      }
    }

    loadHistoricalPrice();

    return () => {
      historicalPriceRequestIsCancelled = true;
    };
  }, [payment.completedAt, currencyAcronym]);

  const historicalFiatAmountCents = useMemo(() => {
    if (historicalPrice == null) return null;
    const receivedBtcAmount = payment.receivedSat / SATOSHIS_PER_BTC;
    return Math.round(receivedBtcAmount * historicalPrice * 100);
  }, [historicalPrice, payment.receivedSat]);

  const currentCatalogTotalCents = useMemo(
    () => resolvedItems.reduce((totalCents, resolvedItem) => totalCents + resolvedItem.subtotal, 0),
    [resolvedItems],
  );

  const resolvePurchasedItem = useCallback((purchasedItem, product, variant = null) => {
    const variantName = variant?.displayName ?? null;
    const resolvedCartItem = buildResolvedCartItem(product, variant, variantName, purchasedItem.quantity);
    setResolvedItems((previousResolvedItems) => [...previousResolvedItems, resolvedCartItem]);
    setUnresolvedPurchasedItems((previousUnresolvedPurchasedItems) => (
      removePurchasedItemFromUnresolved(previousUnresolvedPurchasedItems, purchasedItem)
    ));
  }, []);

  const discardUnresolvedPurchasedItem = useCallback((purchasedItem) => {
    setUnresolvedPurchasedItems((previousUnresolvedPurchasedItems) => (
      removePurchasedItemFromUnresolved(previousUnresolvedPurchasedItems, purchasedItem)
    ));
  }, []);

  const addNewItem = useCallback((product, variant = null) => {
    const availableQuantity = getAvailableQuantity(product, variant);
    const variantName = variant?.displayName ?? null;
    setResolvedItems((previousResolvedItems) => (
      addCartItem(previousResolvedItems, product, variant, availableQuantity, variantName)
    ));
  }, []);

  const updateItemQuantity = useCallback((cartItemId, quantity) => {
    setResolvedItems((previousResolvedItems) => {
      const targetCartItem = previousResolvedItems.find((resolvedItem) => resolvedItem.id === cartItemId);
      if (!targetCartItem) return previousResolvedItems;
      return setCartItemQuantity(previousResolvedItems, cartItemId, quantity, targetCartItem.maxQuantity);
    });
  }, []);

  const removeItem = useCallback((cartItemId) => {
    setResolvedItems((previousResolvedItems) => removeCartItem(previousResolvedItems, cartItemId));
  }, []);

  const canConfirm = !isAutoResolving
    && unresolvedPurchasedItems.length === 0
    && resolvedItems.length > 0
    && historicalFiatAmountCents != null
    && paymentMethodId != null;

  const confirm = useCallback(async () => {
    if (!canConfirm) return null;

    setIsConfirming(true);
    setConfirmPaymentError(null);
    try {
      const storeCheckoutRequest = {
        userId,
        items: resolvedItems.map((resolvedItem) => ({
          productId: String(resolvedItem.productId),
          variantId: resolvedItem.variantId,
          quantity: resolvedItem.quantity,
          priceAtOrder: resolvedItem.price,
        })),
        paymentMethodId,
        currencyId,
        amount: historicalFiatAmountCents / 100,
        transactionId: "",
        satoshiAmount: payment.receivedSat,
        exchangeRateAtPayment: historicalPrice,
        paymentHash: payment.paymentHash,
        exchangeRateCurrency: currencyAcronym,
        fiatAmountAtPayment: historicalFiatAmountCents / 100,
        discountAmount: 0,
        tipAmount: 0,
      };
      return await confirmPaymentWithoutOrder(storeCheckoutRequest);
    } catch (checkoutError) {
      setConfirmPaymentError(checkoutError);
      throw checkoutError;
    } finally {
      setIsConfirming(false);
    }
  }, [
    canConfirm,
    resolvedItems,
    userId,
    paymentMethodId,
    currencyId,
    historicalFiatAmountCents,
    payment.receivedSat,
    payment.paymentHash,
    historicalPrice,
    currencyAcronym,
  ]);

  return {
    resolvedItems,
    unresolvedPurchasedItems,
    isAutoResolving,
    historicalPrice,
    historicalPriceError,
    historicalFiatAmountCents,
    currentCatalogTotalCents,
    isConfirming,
    confirmPaymentError,
    canConfirm,
    resolvePurchasedItem,
    discardUnresolvedPurchasedItem,
    addNewItem,
    updateItemQuantity,
    removeItem,
    confirm,
  };
}
