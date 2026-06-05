"use client";

import { useCallback, useEffect, useRef } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

export function useCartOperations({ cart, setCart, products }) {
  const cartTranslations = useTranslations("cart");
  const outOfStockTimeoutRef = useRef(null);

  const notifyOutOfStock = useCallback(() => {
    if (outOfStockTimeoutRef.current) {
      clearTimeout(outOfStockTimeoutRef.current);
    }
    outOfStockTimeoutRef.current = setTimeout(() => {
      addToast({
        color: "danger",
        description: cartTranslations("errors.outOfStock"),
      });
    }, 250);
  }, [cartTranslations]);

  useEffect(() => () => {
    if (outOfStockTimeoutRef.current) {
      clearTimeout(outOfStockTimeoutRef.current);
    }
  }, []);

  const getAvailableQuantity = (productId) => {
    const product = products.find((product) => product.id === productId);
    return Number(product?.quantity) || 0;
  };

  const addProduct = (product) => {
    const availableQuantity = getAvailableQuantity(product.id);
    if (availableQuantity <= 0) {
      notifyOutOfStock();
      return;
    }

    const existingCartItem = cart.find((item) => item.id === product.id);

    if (existingCartItem) {
      if (existingCartItem.quantity + 1 > availableQuantity) {
        notifyOutOfStock();
        return;
      }
      setCart(
        cart.map((item) => (item.id === product.id
          ? {
              ...item,
              imageUrl: item.imageUrl ?? product.imageUrl,
              quantity: existingCartItem.quantity + 1,
              subtotal: (existingCartItem.quantity + 1) * item.price,
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

  const updateQuantity = (productId, quantity) => {
    if (!Number.isFinite(quantity)) {
      return;
    }
    const availableQuantity = getAvailableQuantity(productId);
    if (quantity > availableQuantity) {
      notifyOutOfStock();
      setCart(
        cart.map((item) => (item.id === productId
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
      removeProduct(productId);
      return;
    }
    setCart(
      cart.map((item) => (item.id === productId
        ? {
            ...item,
            quantity,
            subtotal: quantity * item.price,
          }
        : item),
      ),
    );
  };

  const removeProduct = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  return { addProduct, updateQuantity, removeProduct, clearCart };
}
