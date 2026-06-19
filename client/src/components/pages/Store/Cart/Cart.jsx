"use client";
import { useEffect, useMemo, useState } from "react";

import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";

import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";

import { calculateCartTotals } from "./hooks/cartTotals";
import { useCartOperations } from "./hooks/useCartOperations";
import { useCartPayment } from "./hooks/useCartPayment";
import { usePersistentCart } from "./hooks/usePersistentCart";
import { SearchProducts } from "./SearchProducts";
import { MobileSummaryBar, Summary, SummaryModal } from "./Summary";
import { usePendingRemoval } from "./Summary/hooks/usePendingRemoval";

function syncCartWithProducts(cart, products) {
  const syncedItems = cart
    .filter((cartItem) => products.some((product) => product.id === cartItem.id))
    .map((cartItem) => {
      const catalogProduct = products.find((product) => product.id === cartItem.id);
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
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const {
    cart,
    setCart,
    discount,
    isCartRestored,
    resetCartState,
  } = usePersistentCart();
  const { products, refetch: refetchProducts } = useProducts();
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
    () => cart.filter((item) => !pendingRemovals.has(item.id)),
    [cart, pendingRemovals],
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
    btcPaymentConfig,
    handleBtcInvoiceReady,
    handleBtcComplete,
    clearBtcPaymentConfig,
    cashPaymentConfig,
    handleCashComplete,
    clearCashPaymentConfig,
    cardPaymentConfig,
    handleCardComplete,
    clearCardPaymentConfig,
  } = useCartPayment({
    onResetCart: resetCartState,
    onPay: refetchProducts,
  });

  useEffect(() => {
    if (visibleCart.length === 0) {
      setTimeout(() => setShowMobileSummary(false), 0);
    }
  }, [visibleCart.length]);

  const cartTotal = useMemo(
    () => calculateCartTotals(visibleCart, discount).total,
    [visibleCart, discount],
  );

  const btcPayment = {
    config: btcPaymentConfig,
    onInvoiceReady: handleBtcInvoiceReady,
    onComplete: handleBtcComplete,
    onClose: clearBtcPaymentConfig,
  };

  const cashPayment = {
    config: cashPaymentConfig,
    onComplete: handleCashComplete,
    onClose: clearCashPaymentConfig,
  };

  const cardPayment = {
    config: cardPaymentConfig,
    onComplete: handleCardComplete,
    onClose: clearCardPaymentConfig,
  };

  return (
    <div className={`transition-[padding] duration-200 md:pt-0 ${visibleCart.length ? "pt-14" : "pt-0"}`}>
      <PageHeader title={cartTranslations("title")} subtitle={cartTranslations("subtitle")} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <SearchProducts products={products} categories={categories} onAddProduct={addProduct} />
        </section>
        <div className="hidden md:block">
          <Summary
            cartItems={visibleCart}
            discount={discount}
            onRemoveProduct={removeProduct}
            onClearCart={handleClearCart}
            onUpdateQuantity={updateQuantity}
            startRemoval={startRemoval}
            cancelRemoval={cancelRemoval}
            onPay={handlePay}
            isPaying={isPaying}
            paymentError={paymentError}
            onClearPaymentError={clearPaymentError}
            btcPayment={btcPayment}
            cashPayment={cashPayment}
            cardPayment={cardPayment}
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
        onRemoveProduct={removeProduct}
        onClearCart={handleClearCart}
        onUpdateQuantity={updateQuantity}
        startRemoval={startRemoval}
        cancelRemoval={cancelRemoval}
        onPay={handlePay}
        isPaying={isPaying}
        paymentError={paymentError}
        onClearPaymentError={clearPaymentError}
        btcPayment={btcPayment}
        cashPayment={cashPayment}
        cardPayment={cardPayment}
      />
    </div>
  );
}
