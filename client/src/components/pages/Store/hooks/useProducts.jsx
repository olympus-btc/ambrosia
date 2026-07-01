"use client";
import { useState, useEffect, useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useUpload } from "@/components/hooks/useUpload";
import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

import { buildHttpError } from "../utils/buildHttpError";
import { buildRequestPayload } from "../utils/buildRequestPayload";
import { resolveImageUrl } from "../utils/resolveImageUrl";

export function useProducts() {
  const productsTranslation = useTranslations("products");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { upload, isUploading } = useUpload();

  const notifyMutationError = (mutationError) => {
    if (mutationError?.status === 409) {
      addToast({
        title: productsTranslation("toasts.duplicateSkuTitle"),
        description: productsTranslation("toasts.duplicateSkuDescription"),
        color: "danger",
      });
      return;
    }

    addToast({
      title: productsTranslation("toasts.genericErrorTitle"),
      description: productsTranslation("toasts.genericErrorDescription"),
      color: "danger",
    });
  };

  const ensureSuccess = async (response) => {
    const responseBody = await parseJsonResponse(response, null);
    if (!response.ok) throw buildHttpError(response, responseBody);
    return responseBody;
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const productsResponse = await httpClient("/products");
      if (!productsResponse.ok) return;
      const fetchedProducts = await parseJsonResponse(productsResponse, []);
      setProducts(toArray(fetchedProducts));
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  const addProduct = async (product) => {
    try {
      const uploadedUrl = await resolveImageUrl(product, upload);

      const createProductResponse = await httpClient("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestPayload(product, uploadedUrl)),
        notShowError: false,
      });

      const createdProduct = await ensureSuccess(createProductResponse);
      await fetchProducts();
      return createdProduct;
    } catch (addError) {
      notifyMutationError(addError);
      throw addError;
    }
  };

  const updateProduct = async (product) => {
    try {
      const uploadedUrl = await resolveImageUrl(product, upload);

      const updateProductResponse = await httpClient(`/products/${product.productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestPayload(product, uploadedUrl, { includeId: true })),
        notShowError: false,
      });

      const updatedProduct = await ensureSuccess(updateProductResponse);
      await fetchProducts();
      return updatedProduct;
    } catch (updateError) {
      notifyMutationError(updateError);
      throw updateError;
    }
  };

  const deleteProduct = async (product) => {
    try {
      const deleteProductResponse = await httpClient(`/products/${product.id}`, {
        method: "DELETE",
        notShowError: false,
      });
      await ensureSuccess(deleteProductResponse);
      await fetchProducts();
    } catch (deleteError) {
      if (deleteError?.status === 409) {
        addToast({
          title: productsTranslation("toasts.bundleComponentErrorTitle"),
          description: productsTranslation("toasts.bundleComponentErrorDescription"),
          color: "danger",
        });
        return;
      }
      notifyMutationError(deleteError);
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
