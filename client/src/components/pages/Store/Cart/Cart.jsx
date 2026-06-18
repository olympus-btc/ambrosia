"use client";
import { useEffect, useMemo, useState } from "react";

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
    if (cart.length === 0) {
      setTimeout(() => setShowMobileSummary(false), 0);
    }
  }, [cart.length]);

  const cartTotal = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const discountRate = Number(discount) || 0;
    return subtotal - (subtotal * discountRate) / 100;
  }, [cart, discount]);

  return (
    <div className={`transition-[padding] duration-200 md:pt-0 ${cart.length ? "pt-14" : "pt-0"}`}>
      <PageHeader title={cartTranslations("title")} subtitle={cartTranslations("subtitle")} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <SearchProducts products={products} categories={categories} onAddProduct={addProduct} />
        </section>
        <div className="hidden md:block">
          <Summary
            cartItems={cart}
            discount={discount}
            onRemoveProduct={removeProduct}
            onClearCart={clearCart}
            onUpdateQuantity={updateQuantity}
            onPay={handlePay}
            isPaying={isPaying}
            paymentError={paymentError}
            onClearPaymentError={clearPaymentError}
          />
        </div>
      </div>

      <MobileSummaryBar
        cart={cart}
        total={cartTotal}
        onCheckout={() => setShowMobileSummary(true)}
      />

      <SummaryModal
        isOpen={showMobileSummary}
        onClose={() => setShowMobileSummary(false)}
        cartItems={cart}
        discount={discount}
        onRemoveProduct={removeProduct}
        onClearCart={clearCart}
        onUpdateQuantity={updateQuantity}
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
