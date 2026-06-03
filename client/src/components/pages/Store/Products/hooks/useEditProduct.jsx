"use client";
import { useCallback, useState } from "react";

export function useEditProduct({ fetchProductDetail }) {
  const [productVariants, setProductVariants] = useState([]);
  const [productOptions, setProductOptions] = useState([]);

  const loadProductDetail = useCallback(async (productId) => {
    if (!productId) return;
    const productDetail = await fetchProductDetail(productId);
    if (!productDetail) return;
    setProductVariants(productDetail.variants ?? []);
    setProductOptions(productDetail.options ?? []);
  }, [fetchProductDetail]);

  return { productVariants, productOptions, loadProductDetail };
}
