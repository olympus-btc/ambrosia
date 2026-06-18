"use client";

import { useCallback, useEffect, useRef } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import {
  addCartItem,
  removeCartItem,
  setCartItemQuantity,
} from "../utils/cartItemOperations";

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

  const getAvailableQuantity = useCallback(
    (productId) => {
      const product = products.find((product) => product.id === productId);
      return Number(product?.quantity) || 0;
    },
    [products],
  );

  const addProduct = useCallback(
    (product) => {
      const availableQuantity = getAvailableQuantity(product.id);
      if (availableQuantity <= 0) {
        notifyOutOfStock();
        return;
      }

      const nextCart = addCartItem(cart, product, availableQuantity);
      if (nextCart === cart) {
        notifyOutOfStock();
        return;
      }
      setCart(nextCart);
    },
    [cart, getAvailableQuantity, notifyOutOfStock, setCart],
  );

  const updateQuantity = useCallback(
    (productId, quantity) => {
      if (!Number.isFinite(quantity)) {
        return;
      }

      const availableQuantity = getAvailableQuantity(productId);
      if (quantity > availableQuantity) {
        notifyOutOfStock();
        setCart(setCartItemQuantity(cart, productId, availableQuantity, availableQuantity));
        return;
      }

      if (quantity <= 0) {
        setCart(removeCartItem(cart, productId));
        return;
      }

      setCart(setCartItemQuantity(cart, productId, quantity, availableQuantity));
    },
    [cart, getAvailableQuantity, notifyOutOfStock, setCart],
  );

  const removeProduct = useCallback(
    (productId) => {
      setCart(removeCartItem(cart, productId));
    },
    [cart, setCart],
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, [setCart]);

  return { addProduct, updateQuantity, removeProduct, clearCart };
}
