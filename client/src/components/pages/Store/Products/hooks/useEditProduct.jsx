"use client";
import { useCallback, useState } from "react";

export function useEditProduct({ fetchProductDetail }) {
  const [productVariants, setProductVariants] = useState([]);
  const [productOptions, setProductOptions] = useState([]);

  const loadProductDetail = useCallback(async (productId) => {
    if (!productId) return;
    const loadedProductDetail = await fetchProductDetail(productId);
    if (!loadedProductDetail) return;
    setProductVariants(loadedProductDetail.variants ?? []);
    setProductOptions(loadedProductDetail.options ?? []);
  }, [fetchProductDetail]);

  return { productVariants, productOptions, loadProductDetail };
}
