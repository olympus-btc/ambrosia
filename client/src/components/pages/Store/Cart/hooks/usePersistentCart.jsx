"use client";

import { useCallback, useEffect, useState } from "react";

export const CART_STORAGE_KEY = "store-cart";

export function usePersistentCart() {
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
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
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ items: cart, discount }),
      );
    } catch (err) {
      console.error("Error saving cart to storage", err);
    }
  }, [cart, discount, hydrated]);

  const resetCartState = useCallback(() => {
    setCart([]);
    setDiscount(0);
    if (typeof window === "undefined") return;
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
    hydrated,
    resetCartState,
  };
}
