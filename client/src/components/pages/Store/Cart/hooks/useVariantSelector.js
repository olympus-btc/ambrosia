"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

import { useProductVariants } from "@/components/pages/Store/hooks/useProductVariants";
import { deriveVariantDisplayName, findMatchingVariant } from "@/components/pages/Store/utils/variantUtils";

const initialState = {
  productDetail: null,
  isLoading: false,
  selectedValues: {},
};

function reducer(state, action) {
  switch (action.type) {
    case "FETCH_START":
      return { productDetail: null, isLoading: true, selectedValues: {} };
    case "FETCH_SUCCESS":
      return { ...state, productDetail: action.detail, isLoading: false };
    case "FETCH_ERROR":
      return { ...state, isLoading: false };
    case "TOGGLE_VALUE": {
      const current = state.selectedValues[action.optionTypeId];
      return {
        ...state,
        selectedValues: {
          ...state.selectedValues,
          [action.optionTypeId]: current === action.valueId ? undefined : action.valueId,
        },
      };
    }
    default:
      return state;
  }
}

export function useVariantSelector({ product, isOpen, onClose, onAddToCart }) {
  const { fetchProductDetail } = useProductVariants();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!isOpen || !product) return;
    dispatch({ type: "FETCH_START" });
    fetchProductDetail(product.id)
      .then((detail) => dispatch({ type: "FETCH_SUCCESS", detail }))
      .catch(() => dispatch({ type: "FETCH_ERROR" }));
  }, [isOpen, product, fetchProductDetail]);

  const { productDetail, isLoading, selectedValues } = state;
  const options = useMemo(() => productDetail?.options ?? [], [productDetail]);
  const variants = useMemo(() => productDetail?.variants ?? [], [productDetail]);

  const selectedValueIds = options.map((option) => selectedValues[option.id]).filter(Boolean);
  const allSelected = options.length > 0 && selectedValueIds.length === options.length;
  const matchedVariant = allSelected ? findMatchingVariant(variants, selectedValueIds) : null;
  const isOutOfStock = matchedVariant ? matchedVariant.quantity <= 0 : false;
  const isDisabled = isLoading || !allSelected || !matchedVariant || isOutOfStock;

  const isValueAvailable = (optionType, valueId) => {
    const hypotheticalSelection = { ...selectedValues, [optionType.id]: valueId };
    const hypotheticalIds = options.map((option) => hypotheticalSelection[option.id]).filter(Boolean);
    return variants.some((variant) => {
      const variantValueIds = variant.optionValueIds ?? [];
      return hypotheticalIds.every((id) => variantValueIds.includes(id)) && variant.quantity > 0;
    });
  };

  const toggleOptionValue = useCallback((optionTypeId, valueId) => {
    dispatch({ type: "TOGGLE_VALUE", optionTypeId, valueId });
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!matchedVariant) return;
    const variantName = deriveVariantDisplayName(matchedVariant.optionValueIds, options);
    onAddToCart(product, { ...matchedVariant, _variantName: variantName });
    onClose();
  }, [matchedVariant, options, onAddToCart, product, onClose]);

  return {
    options,
    isLoading,
    selectedValues,
    allSelected,
    isDisabled,
    matchedVariant,
    isOutOfStock,
    isValueAvailable,
    toggleOptionValue,
    handleAddToCart,
  };
}
