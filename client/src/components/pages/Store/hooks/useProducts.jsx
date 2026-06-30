"use client";
import { useState, useEffect, useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useUpload } from "@/components/hooks/useUpload";
import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";
import { useFetchList } from "@/lib/http/useFetchList";

import { toFiniteNumber } from "../Products/utils/number";
import { resolveImageUrl } from "../Products/utils/resolveImageUrl";

import { useProductVariants } from "./useProductVariants";

export function useProducts() {
  const t = useTranslations("products");
  const { fetchList } = useFetchList();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { upload, isUploading } = useUpload();
  const { addVariant, updateVariant } = useProductVariants();

  const normalizeSku = (sku) => sku?.trim() || null;

  const buildRequestPayload = (product, imageUrl, { includeId = false } = {}) => {
    const hasVariants = product.hasVariants ?? false;
    return {
      ...(includeId ? { id: product.productId } : {}),
      SKU: normalizeSku(product.productSKU),
      name: product.productName,
      description: product.productDescription || null,
      imageUrl,
      categoryIds: toArray(product.productCategories),
      hasVariants,
      ...(!hasVariants ? {
        priceCents: Math.round(toFiniteNumber(product.productPrice) * 100),
        quantity: toFiniteNumber(product.productStock),
      } : {}),
      minStockThreshold: toFiniteNumber(product.productMinStock),
      maxStockThreshold: toFiniteNumber(product.productMaxStock),
    };
  };

  const buildDefaultVariantPayload = (product) => ({
    SKU: normalizeSku(product.productSKU),
    priceCents: Math.round(toFiniteNumber(product.productPrice) * 100),
    quantity: toFiniteNumber(product.productStock),
    isActive: true,
  });

  const buildHttpError = (response, payload) => ({
    status: response.status,
    message: payload?.message || "Request failed",
  });

  const notifyMutationError = (error) => {
    if (error?.status === 409) {
      addToast({
        title: t("toasts.duplicateSkuTitle"),
        description: t("toasts.duplicateSkuDescription"),
        color: "danger",
      });
      return;
    }

    addToast({
      title: t("toasts.genericErrorTitle"),
      description: t("toasts.genericErrorDescription"),
      color: "danger",
    });
  };

  const validateProductResponse = async (productResponse) => {
    const productData = await parseJsonResponse(productResponse, null);
    if (!productResponse.ok) throw buildHttpError(productResponse, productData);
    return productData;
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const productsData = await fetchList("/products");
      if (productsData === null) return;
      setProducts(toArray(productsData));
    } catch (error) {
      console.error("Error fetching products:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  const addProduct = async (product) => {
    try {
      const uploadedUrl = await resolveImageUrl(product.productImage, product.productImageUrl || null, upload);

      const addProductResponse = await httpClient("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestPayload(product, uploadedUrl)),
        notShowError: false,
      });

      const createdProduct = await validateProductResponse(addProductResponse);

      await fetchProducts();
      return createdProduct;
    } catch (error) {
      notifyMutationError(error);
      throw error;
    }
  };

  const updateProduct = async (product) => {
    try {
      let uploadedUrl;
      if (product.productImageRemoved) {
        uploadedUrl = null;
      } else {
        uploadedUrl = await resolveImageUrl(product.productImage, product.productImageUrl || null, upload);
      }

      const updateProductResponse = await httpClient(`/products/${product.productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestPayload(product, uploadedUrl, { includeId: true })),
        notShowError: false,
      });

      const updatedProduct = await validateProductResponse(updateProductResponse);

      if (!product.hasVariants && product.productVariantId) {
        await updateVariant(product.productId, product.productVariantId, buildDefaultVariantPayload(product));
      }

      await fetchProducts();
      return updatedProduct;
    } catch (error) {
      notifyMutationError(error);
      throw error;
    }
  };

  const deleteProduct = async (product) => {
    try {
      const deleteProductResponse = await httpClient(`/products/${product.id}`, {
        method: "DELETE",
        notShowError: false,
      });
      await validateProductResponse(deleteProductResponse);
      await fetchProducts();
      return true;
    } catch (error) {
      notifyMutationError(error);
      return false;
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    addProduct,
    isUploading,
    updateProduct,
    deleteProduct,
    loading,
    error,
    refetch: fetchProducts,
  };
}
