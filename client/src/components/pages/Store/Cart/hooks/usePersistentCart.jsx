"use client";

import { useCallback, useEffect, useState } from "react";

export const CART_STORAGE_KEY = "store-cart";

export function usePersistentCart() {
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("percentage");
  const [isCartRestored, setIsCartRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!saved) return;

      const savedCart = JSON.parse(saved);
      if (Array.isArray(savedCart?.items)) {
        setCart(savedCart.items);
      }
      const savedDiscount = Number(savedCart?.discount);
      if (Number.isFinite(savedDiscount)) {
        setDiscount(savedDiscount);
      }
      if (savedCart?.discountType === "fixed" || savedCart?.discountType === "percentage") {
        setDiscountType(savedCart.discountType);
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
        JSON.stringify({ items: cart, discount, discountType }),
      );
    } catch (err) {
      console.error("Error saving cart to storage", err);
    }
  }, [cart, discount, discountType, isCartRestored]);

  const resetCartState = useCallback(() => {
    setCart([]);
    setDiscount(0);
    setDiscountType("percentage");
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
    discountType,
    setDiscountType,
    isCartRestored,
    resetCartState,
  };
}
