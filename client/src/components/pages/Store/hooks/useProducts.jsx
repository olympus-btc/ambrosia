"use client";
import { useState, useEffect, useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useUpload } from "@/components/hooks/useUpload";
import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";
import { useFetchList } from "@/lib/http/useFetchList";

export function useProducts() {
  const t = useTranslations("products");
  const { fetchList } = useFetchList();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { upload, isUploading } = useUpload();

  const normalizeSku = (sku) => sku?.trim() || null;

  const buildRequestPayload = (product, imageUrl, { includeId = false } = {}) => {
    const priceNumber = Number(product.productPrice ?? 0);
    const priceCents = Number.isFinite(priceNumber)
      ? Math.round(priceNumber * 100)
      : 0;
    const quantityNumber = Number(product.productStock ?? 0);
    const minStockNumber = Number(product.productMinStock ?? 0);
    const maxStockNumber = Number(product.productMaxStock ?? 0);

    return {
      ...(includeId ? { id: product.productId } : {}),
      SKU: normalizeSku(product.productSKU),
      name: product.productName,
      description: product.productDescription || null,
      imageUrl,
      costCents: priceCents,
      categoryIds: toArray(product.productCategories),
      quantity: Number.isFinite(quantityNumber) ? quantityNumber : 0,
      minStockThreshold: Number.isFinite(minStockNumber) ? minStockNumber : 0,
      maxStockThreshold: Number.isFinite(maxStockNumber) ? maxStockNumber : 0,
      priceCents,
    };
  };

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

  const ensureSuccess = async (response) => {
    const payload = await parseJsonResponse(response, null);
    if (!response.ok) throw buildHttpError(response, payload);
    return payload;
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
      let uploadedUrl = product.productImageUrl || null;
      if (product.productImage instanceof File) {
        const uploads = await upload([product.productImage]);
        uploadedUrl = uploads?.[0]?.url || uploads?.[0]?.path || null;
      }

      const response = await httpClient("/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildRequestPayload(product, uploadedUrl)),
        notShowError: false,
      });

      const payload = await ensureSuccess(response);
      await fetchProducts();
      return payload;
    } catch (error) {
      notifyMutationError(error);
      throw error;
    }
  };

  const updateProduct = async (product) => {
    try {
      let uploadedUrl = product.productImageUrl || null;
      if (product.productImage instanceof File) {
        const uploads = await upload([product.productImage]);
        uploadedUrl = uploads?.[0]?.url || uploads?.[0]?.path || null;
      } else if (product.productImageRemoved) {
        uploadedUrl = null;
      }

      const response = await httpClient(`/products/${product.productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildRequestPayload(product, uploadedUrl, { includeId: true })),
        notShowError: false,
      });

      const payload = await ensureSuccess(response);
      await fetchProducts();
      return payload;
    } catch (error) {
      notifyMutationError(error);
      throw error;
    }
  };

  const deleteProduct = async (product) => {
    await httpClient(`/products/${product.id}`, {
      method: "DELETE",
      notShowError: false,
    });

    await fetchProducts();
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
