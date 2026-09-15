"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";
import { useConfigurations } from "@/providers/configurations/configurationsProvider";

import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";

import { BitcoinPaymentModal } from "./BitcoinPaymentModal";
import { CardPaymentModal } from "./CardPaymentModal";
import { CashPaymentModal } from "./CashPaymentModal";
import { useCartOperations } from "./hooks/useCartOperations";
import { useCartPayment } from "./hooks/useCartPayment";
import { usePersistentCart } from "./hooks/usePersistentCart";
import { PermissionBlockedState } from "./PermissionBlockedState";
import { SearchProducts } from "./SearchProducts";
import { MobileSummaryBar, Summary, SummaryModal } from "./Summary";
import { usePendingRemoval } from "./Summary/hooks/usePendingRemoval";
import { TransferPaymentModal } from "./TransferPaymentModal";
import { calculateCartTotals } from "./utils/cartTotals";

function syncCartWithProducts(cart, products) {
  const syncedItems = cart
    .filter((cartItem) => products.some((product) => product.id === (cartItem.productId ?? cartItem.id)))
    .map((cartItem) => {
      if (cartItem.variantId) return cartItem;
      const catalogProduct = products.find((product) => product.id === (cartItem.productId ?? cartItem.id));
      return catalogProduct.priceCents === cartItem.price
        ? cartItem
        : { ...cartItem, price: catalogProduct.priceCents, subtotal: cartItem.quantity * catalogProduct.priceCents };
    });

  const hasChanges =
    syncedItems.length !== cart.length ||
    syncedItems.some((cartItem, index) => cartItem !== cart[index]);

  return hasChanges ? syncedItems : cart;
}

export function Cart() {
  const cartTranslations = useTranslations("cart");
  const { config } = useConfigurations();
  const tipsEnabled = config?.tipsEnabled === true;
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const {
    cart,
    setCart,
    discount,
    setDiscount,
    discountType,
    setDiscountType,
    tip,
    setTip,
    tipType,
    setTipType,
    isCartRestored,
    resetCartState,
  } = usePersistentCart();

  const handleApplyDiscount = useCallback(
    (discountValue, selectedDiscountType) => {
      setDiscount(discountValue);
      setDiscountType(selectedDiscountType);
    },
    [setDiscount, setDiscountType],
  );

  const handleApplyTip = useCallback(
    (tipValue, selectedTipType) => {
      setTip(tipValue);
      setTipType(selectedTipType);
    },
    [setTip, setTipType],
  );
  const { products, forbidden: productsForbidden, refetch: refetchProducts } = useProducts({ skipForbiddenRedirect: true });
  const { categories } = useCategories();

  useEffect(() => {
    if (!isCartRestored || products.length === 0) return;
    setCart((currentCart) => syncCartWithProducts(currentCart, products));
  }, [products, isCartRestored, setCart]);

  const { addProduct, updateQuantity, removeProduct, clearCart } = useCartOperations({
    cart,
    setCart,
    products,
  });

  const {
    pendingRemovals,
    startRemoval,
    cancelRemoval,
    clearPendingRemovals,
  } = usePendingRemoval();

  const visibleCart = useMemo(
    () => cart.filter((cartItem) => !pendingRemovals.has(cartItem.id)),
    [cart, pendingRemovals],
  );

  const handleAddProduct = useCallback(
    (product, variant = null) => {
      const cartItemId = variant?.id ?? product.id;
      if (pendingRemovals.has(cartItemId)) {
        cancelRemoval(cartItemId);
        return;
      }
      addProduct(product, variant);
    },
    [addProduct, cancelRemoval, pendingRemovals],
  );

  const handleClearCart = () => {
    clearPendingRemovals();
    clearCart();
  };

  const {
    handlePay,
    isPaying,
    paymentError,
    clearPaymentError,
    paymentsForbidden,
    btcPayment: {
      config: btcPaymentConfig,
      onClose: clearBtcPaymentConfig,
      onInvoiceReady: handleBtcInvoiceReady,
      onComplete: handleBtcComplete,
    },
    cashPayment: {
      config: cashPaymentConfig,
      onClose: clearCashPaymentConfig,
      onComplete: handleCashComplete,
    },
    cardPayment: {
      config: cardPaymentConfig,
      onClose: clearCardPaymentConfig,
      onComplete: handleCardComplete,
    },
    transferPayment: {
      config: transferPaymentConfig,
      onClose: clearTransferPaymentConfig,
      onComplete: handleTransferComplete,
    },
  } = useCartPayment({
    onResetCart: resetCartState,
    onPay: refetchProducts,
  });

  useEffect(() => {
    if (visibleCart.length === 0) {
      setTimeout(() => setShowMobileSummary(false), 0);
      setDiscount(0);
      setDiscountType("percentage");
      setTip(0);
      setTipType("percentage");
    }
  }, [visibleCart.length, discount, tip, setDiscount, setDiscountType, setTip, setTipType]);

  const cartTotal = useMemo(
    () => calculateCartTotals(
      visibleCart,
      discount,
      discountType,
      tipsEnabled ? tip : 0,
      tipType,
    ).total,
    [visibleCart, discount, discountType, tipsEnabled, tip, tipType],
  );

  const missingPermissions = [
    ...(productsForbidden ? ["products_read"] : []),
    ...(paymentsForbidden ? ["payments_read"] : []),
  ];

  if (missingPermissions.length > 0) {
    return (
      <div>
        <PageHeader title={cartTranslations("title")} subtitle={cartTranslations("subtitle")} />
        <PermissionBlockedState missingPermissions={missingPermissions} />
      </div>
    );
  }

  return (
    <div className={`transition-[padding] duration-200 md:pt-0 ${visibleCart.length ? "pt-14" : "pt-0"}`}>
      <PageHeader title={cartTranslations("title")} subtitle={cartTranslations("subtitle")} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <SearchProducts products={products} categories={categories} onAddProduct={handleAddProduct} />
        </section>
        <div className="hidden md:block">
          <Summary
            cartItems={visibleCart}
            discount={discount}
            discountType={discountType}
            onApplyDiscount={handleApplyDiscount}
            tip={tip}
            tipType={tipType}
            tipsEnabled={tipsEnabled}
            tipPercentages={config?.tipPercentages}
            onApplyTip={handleApplyTip}
            onRemoveProduct={removeProduct}
            onClearCart={handleClearCart}
            onUpdateQuantity={updateQuantity}
            startRemoval={startRemoval}
            cancelRemoval={cancelRemoval}
            onPay={handlePay}
            isPaying={isPaying}
            paymentError={paymentError}
            onClearPaymentError={clearPaymentError}
          />
        </div>
      </div>

      <MobileSummaryBar
        cart={visibleCart}
        total={cartTotal}
        onCheckout={() => setShowMobileSummary(true)}
      />

      <SummaryModal
        isOpen={showMobileSummary}
        onClose={() => setShowMobileSummary(false)}
        cartItems={visibleCart}
        discount={discount}
        discountType={discountType}
        onApplyDiscount={handleApplyDiscount}
        tip={tip}
        tipType={tipType}
        tipsEnabled={tipsEnabled}
        tipPercentages={config?.tipPercentages}
        onApplyTip={handleApplyTip}
        onRemoveProduct={removeProduct}
        onClearCart={handleClearCart}
        onUpdateQuantity={updateQuantity}
        startRemoval={startRemoval}
        cancelRemoval={cancelRemoval}
        onPay={handlePay}
        isPaying={isPaying}
        paymentError={paymentError}
        onClearPaymentError={clearPaymentError}
      />

      <BitcoinPaymentModal
        isOpen={!!btcPaymentConfig}
        amountFiat={btcPaymentConfig?.amountFiat}
        currencyAcronym={btcPaymentConfig?.currencyAcronym}
        paymentId={btcPaymentConfig?.paymentId}
        invoiceDescription={btcPaymentConfig?.invoiceDescription}
        displayTotal={btcPaymentConfig?.displayTotal}
        onClose={clearBtcPaymentConfig}
        onInvoiceReady={handleBtcInvoiceReady}
        onComplete={handleBtcComplete}
      />

      <CashPaymentModal
        isOpen={!!cashPaymentConfig}
        amountDue={cashPaymentConfig?.amountDue}
        displayTotal={cashPaymentConfig?.displayTotal}
        onClose={clearCashPaymentConfig}
        onComplete={handleCashComplete}
      />

      <CardPaymentModal
        isOpen={!!cardPaymentConfig}
        amountDue={cardPaymentConfig?.amountDue}
        displayTotal={cardPaymentConfig?.displayTotal}
        methodLabel={cardPaymentConfig?.methodLabel}
        onClose={clearCardPaymentConfig}
        onComplete={handleCardComplete}
      />

      <TransferPaymentModal
        isOpen={!!transferPaymentConfig}
        amountDue={transferPaymentConfig?.amountDue}
        displayTotal={transferPaymentConfig?.displayTotal}
        methodLabel={transferPaymentConfig?.methodLabel}
        onClose={clearTransferPaymentConfig}
        onComplete={handleTransferComplete}
      />
    </div>
  );
}
