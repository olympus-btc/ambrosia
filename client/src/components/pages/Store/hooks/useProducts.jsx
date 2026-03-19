"use client";
import { useState, useEffect, useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useUpload } from "@/components/hooks/useUpload";
import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

export function useProducts() {
  const t = useTranslations("products");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { upload, isUploading } = useUpload();

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
      SKU: product.productSKU,
      name: product.productName,
      description: product.productDescription || null,
      image_url: imageUrl,
      cost_cents: priceCents,
      category_ids: toArray(product.productCategories),
      quantity: Number.isFinite(quantityNumber) ? quantityNumber : 0,
      min_stock_threshold: Number.isFinite(minStockNumber) ? minStockNumber : 0,
      max_stock_threshold: Number.isFinite(maxStockNumber) ? maxStockNumber : 0,
      price_cents: priceCents,
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
      const response = await httpClient("/products");
      const productsData = await parseJsonResponse(response, []);
      setProducts(toArray(productsData));
    } catch (error) {
      console.error("Error fetching products:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

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
