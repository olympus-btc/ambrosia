"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";

import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";

import { useCartPayment } from "./hooks/useCartPayment";
import { usePersistentCart } from "./hooks/usePersistentCart";
import { SearchProducts } from "./SearchProducts";
import { MobileSummaryBar, Summary, SummaryModal } from "./Summary";

export function Cart() {
  const t = useTranslations("cart");
  const outOfStockTimeoutRef = useRef(null);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const {
    cart,
    setCart,
    discount,
    resetCartState,
  } = usePersistentCart();
  const { products, refetch: refetchProducts } = useProducts();
  const { categories } = useCategories();

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

  const notifyOutOfStock = useCallback(() => {
    if (outOfStockTimeoutRef.current) {
      clearTimeout(outOfStockTimeoutRef.current);
    }
    outOfStockTimeoutRef.current = setTimeout(() => {
      addToast({
        color: "danger",
        description: t("errors.outOfStock"),
      });
    }, 250);
  }, [t]);

  useEffect(() => () => {
    if (outOfStockTimeoutRef.current) {
      clearTimeout(outOfStockTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (cart.length === 0) {
      setTimeout(() => setShowMobileSummary(false), 0);
    }
  }, [cart.length]);

  const cartTotal = useMemo(() => {
    const sub = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const disc = Number(discount) || 0;
    return sub - (sub * disc) / 100;
  }, [cart, discount]);

  const getAvailableQuantity = (productId) => {
    const product = products.find((item) => item.id === productId);
    return Number(product?.quantity) || 0;
  };

  const addProduct = (product) => {
    const availableQuantity = getAvailableQuantity(product.id);
    if (availableQuantity <= 0) {
      notifyOutOfStock();
      return;
    }

    const itemExist = cart.find((item) => item.id === product.id);

    if (itemExist) {
      if (itemExist.quantity + 1 > availableQuantity) {
        notifyOutOfStock();
        return;
      }
      setCart(
        cart.map((item) => (item.id === product.id
          ? {
              ...item,
              imageUrl: item.imageUrl ?? product.imageUrl,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * item.price,
            }
          : item),
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          imageUrl: product.imageUrl,
          name: product.name,
          price: product.priceCents,
          quantity: 1,
          subtotal: product.priceCents,
        },
      ]);
    }
  };

  const updateQuantity = (id, quantity) => {
    if (!Number.isFinite(quantity)) {
      return;
    }
    const availableQuantity = getAvailableQuantity(id);
    if (quantity > availableQuantity) {
      notifyOutOfStock();
      setCart(
        cart.map((item) => (item.id === id
          ? {
              ...item,
              quantity: availableQuantity,
              subtotal: availableQuantity * item.price,
            }
          : item),
        ),
      );
      return;
    }
    if (quantity <= 0) {
      removeProduct(id);
      return;
    }
    setCart(
      cart.map((item) => (item.id === id
        ? {
            ...item,
            quantity,
            subtotal: quantity * item.price,
          }
        : item),
      ),
    );
  };

  const removeProduct = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

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
    <div className={`transition-[padding] duration-200 md:pt-0 ${cart.length ? "pt-14" : "pt-0"}`}>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

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
            btcPayment={btcPayment}
            cashPayment={cashPayment}
            cardPayment={cardPayment}
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
        btcPayment={btcPayment}
        cashPayment={cashPayment}
        cardPayment={cardPayment}
      />
    </div>
  );
}
