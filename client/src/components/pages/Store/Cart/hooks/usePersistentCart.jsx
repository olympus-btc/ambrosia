"use client";

import { useCallback, useEffect, useState } from "react";

export const CART_STORAGE_KEY = "store-cart";

export function usePersistentCart() {
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [isCartRestored, setIsCartRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed?.items)) {
        setCart(parsed.items);
      }
      const storedDiscount = Number(parsed?.discount);
      if (Number.isFinite(storedDiscount)) {
        setDiscount(storedDiscount);
      }
    } catch (err) {
      console.error("Error loading cart from storage", err);
    } finally {
      setIsCartRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!isCartRestored) return;
    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ items: cart, discount }),
      );
    } catch (err) {
      console.error("Error saving cart to storage", err);
    }
  }, [cart, discount, isCartRestored]);

  const resetCartState = useCallback(() => {
    setCart([]);
    setDiscount(0);
    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } catch (err) {
      console.error("Error clearing cart storage", err);
    }
  }, []);

  return {
    cart,
    setCart,
    discount,
    setDiscount,
    isCartRestored,
    resetCartState,
  };
}
