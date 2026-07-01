"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useProductVariants } from "@/components/pages/Store/hooks/useProductVariants";
import { variantIsAvailableForSale } from "@/components/pages/Store/utils/productVariantAvailability";
import {
  deriveVariantDisplayName,
  findMatchingVariant,
  variantHasOptionValues,
} from "@/components/pages/Store/utils/productVariantOptionValues";

export function useVariantSelector({ product, isOpen, onClose, onAddToCart }) {
  const { fetchProductDetail } = useProductVariants();
  const [productDetail, setProductDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedValues, setSelectedValues] = useState({});

  useEffect(() => {
    if (!isOpen || !product) return;
    let isCancelled = false;

    const loadProductDetail = async () => {
      if (isCancelled) return;
      setProductDetail(null);
      setIsLoading(true);
      setSelectedValues({});

      try {
        const productDetailResponse = await fetchProductDetail(product.id);
        if (isCancelled) return;
        setProductDetail(productDetailResponse);
        setIsLoading(false);
      } catch {
        if (isCancelled) return;
        setProductDetail(null);
        setSelectedValues({});
        setIsLoading(false);
      }
    };

    loadProductDetail();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, product, fetchProductDetail]);
  const options = useMemo(() => productDetail?.options ?? [], [productDetail]);
  const variants = useMemo(() => productDetail?.variants ?? [], [productDetail]);

  const selectedValueIds = options.map((option) => selectedValues[option.id]).filter(Boolean);
  const allSelected = options.length > 0 && selectedValueIds.length === options.length;
  const matchedVariant = allSelected ? findMatchingVariant(variants, selectedValueIds) : null;
  const isOutOfStock = matchedVariant ? matchedVariant.quantity <= 0 : false;
  const isDisabled = isLoading || !allSelected || !matchedVariant || isOutOfStock;

  const isValueAvailable = (optionType, valueId) => {
    const selectionWithCandidateValue = { ...selectedValues, [optionType.id]: valueId };
    const candidateOptionValueIds = options.map((option) => selectionWithCandidateValue[option.id]).filter(Boolean);
    return variants.some((variant) => (
      variantIsAvailableForSale(variant) && variantHasOptionValues(variant, candidateOptionValueIds)
    ));
  };

  const toggleOptionValue = useCallback((optionTypeId, valueId) => {
    setSelectedValues((previousSelectedValues) => ({
      ...previousSelectedValues,
      [optionTypeId]: previousSelectedValues[optionTypeId] === valueId ? undefined : valueId,
    }));
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!matchedVariant) return;
    const variantName = deriveVariantDisplayName(matchedVariant.optionValueIds, options);
    onAddToCart(product, { ...matchedVariant, displayName: variantName });
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
