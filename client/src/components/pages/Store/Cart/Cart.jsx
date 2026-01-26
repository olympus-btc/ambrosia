"use client";
import { useCallback, useEffect, useRef } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";
import { StoreLayout } from "../StoreLayout";

import { useCartPayment } from "./hooks/useCartPayment";
import { usePersistentCart } from "./hooks/usePersistentCart";
import { SearchProducts } from "./SearchProducts";
import { Summary } from "./Summary";

export function Cart() {
  const t = useTranslations("cart");
  const outOfStockTimeoutRef = useRef(null);
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
          name: product.name,
          price: product.price_cents,
          quantity: 1,
          subtotal: product.price_cents,
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

  return (
    <StoreLayout>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-semibold text-green-800">{t("title")}</h1>
          <p className=" text-gray-800 mt-4">
            {t("subtitle")}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <SearchProducts products={products} categories={categories} onAddProduct={addProduct} />
        </section>
        <Summary
          cartItems={cart}
          discount={discount}
          onRemoveProduct={removeProduct}
          onUpdateQuantity={updateQuantity}
          onPay={handlePay}
          isPaying={isPaying}
          paymentError={paymentError}
          onClearPaymentError={clearPaymentError}
          btcPaymentConfig={btcPaymentConfig}
          onInvoiceReady={handleBtcInvoiceReady}
          onBtcComplete={handleBtcComplete}
          onCloseBtcPayment={clearBtcPaymentConfig}
          cashPaymentConfig={cashPaymentConfig}
          onCashComplete={handleCashComplete}
          onCloseCashPayment={clearCashPaymentConfig}
          cardPaymentConfig={cardPaymentConfig}
          onCardComplete={handleCardComplete}
          onCloseCardPayment={clearCardPaymentConfig}
        />
      </div>
    </StoreLayout>
  );
}
