"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";

import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";

import { BitcoinPaymentModal } from "./BitcoinPaymentModal";
import { CardPaymentModal } from "./CardPaymentModal";
import { CashPaymentModal } from "./CashPaymentModal";
import { useCartOperations } from "./hooks/useCartOperations";
import { useCartPayment } from "./hooks/useCartPayment";
import { usePersistentCart } from "./hooks/usePersistentCart";
import { SearchProducts } from "./SearchProducts";
import { MobileSummaryBar, Summary, SummaryModal } from "./Summary";
import { usePendingRemoval } from "./Summary/hooks/usePendingRemoval";
import { calculateCartTotals } from "./utils/cartTotals";

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
    setDiscount,
    discountType,
    setDiscountType,
    isCartRestored,
    resetCartState,
  } = usePersistentCart();

  const handleApplyDiscount = useCallback(
    (value, type) => {
      setDiscount(value);
      setDiscountType(type);
    },
    [setDiscount, setDiscountType],
  );
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

  const handleAddProduct = useCallback(
    (product) => {
      if (pendingRemovals.has(product.id)) {
        cancelRemoval(product.id);
        return;
      }
      addProduct(product);
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
  } = useCartPayment({
    onResetCart: resetCartState,
    onPay: refetchProducts,
  });

  useEffect(() => {
    if (visibleCart.length === 0) {
      setTimeout(() => setShowMobileSummary(false), 0);
      setDiscount(0);
      setDiscountType("percentage");
    }
  }, [visibleCart.length, setDiscount, setDiscountType]);

  const cartTotal = useMemo(
    () => calculateCartTotals(visibleCart, discount).total,
    [visibleCart, discount],
  );

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
    </div>
  );
}
