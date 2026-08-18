"use client";
import { useState, useEffect, useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useUpload } from "@/components/hooks/useUpload";
import { toArray } from "@/components/utils/array";
import { toFiniteNumber } from "@/components/utils/numberParsers";
import { httpClient, parseJsonResponse } from "@/lib/http";

import { buildHttpError } from "../utils/buildHttpError";
import { buildRequestPayload } from "../utils/buildRequestPayload";
import { normalizeSku } from "../utils/normalizeSku";
import { resolveImageUrl } from "../utils/resolveImageUrl";

import { useProductVariants } from "./useProductVariants";

export function useProducts({ skipForbiddenRedirect = false } = {}) {
  const productsTranslations = useTranslations("products");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const { upload, isUploading } = useUpload();
  const { updateVariant } = useProductVariants();

  const notifyMutationError = (mutationError) => {
    if (mutationError?.status === 409) {
      addToast({
        title: productsTranslations("toasts.duplicateSkuTitle"),
        description: productsTranslations("toasts.duplicateSkuDescription"),
        color: "danger",
      });
      return;
    }

    addToast({
      title: productsTranslations("toasts.genericErrorTitle"),
      description: productsTranslations("toasts.genericErrorDescription"),
      color: "danger",
    });
  };

  const notifyBundleComponentDeleteError = () => {
    addToast({
      title: productsTranslations("toasts.bundleComponentErrorTitle"),
      description: productsTranslations("toasts.bundleComponentErrorDescription"),
      color: "danger",
    });
  };

  const ensureSuccess = async (productMutationResponse) => {
    const parsedProductMutationBody = await parseJsonResponse(productMutationResponse, null);
    if (!productMutationResponse.ok) {
      throw buildHttpError(productMutationResponse, "Request failed", parsedProductMutationBody);
    }
    return parsedProductMutationBody;
  };

  const buildDefaultVariantPayload = (productForm) => {
    const priceCents = Math.round(toFiniteNumber(productForm.productPrice) * 100);
    return {
      SKU: normalizeSku(productForm.productSKU),
      priceCents,
      costCents: priceCents,
      quantity: productForm.isBundle || productForm.trackStock === false
        ? 0
        : toFiniteNumber(productForm.productStock),
      isActive: true,
    };
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const productsResponse = await httpClient("/products", { skipForbiddenRedirect });
      setForbidden(productsResponse.status === 403);
      if (!productsResponse.ok) return;
      const fetchedProducts = await parseJsonResponse(productsResponse, []);
      setProducts(toArray(fetchedProducts));
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [skipForbiddenRedirect]);

  const addProduct = async (productForm) => {
    try {
      const uploadedImageUrl = await resolveImageUrl(productForm, upload);

      const createProductResponse = await httpClient("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestPayload(productForm, uploadedImageUrl)),
        notShowError: false,
      });

      const createdProduct = await ensureSuccess(createProductResponse);
      await fetchProducts();
      return createdProduct;
    } catch (addProductError) {
      notifyMutationError(addProductError);
      throw addProductError;
    }
  };

  const updateProduct = async (productForm) => {
    try {
      const uploadedImageUrl = await resolveImageUrl(productForm, upload);

      const updateProductResponse = await httpClient(`/products/${productForm.productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestPayload(productForm, uploadedImageUrl, { includeId: true })),
        notShowError: false,
      });

      const updatedProduct = await ensureSuccess(updateProductResponse);

      if (!productForm.hasVariants && productForm.productVariantId) {
        await updateVariant(productForm.productId, productForm.productVariantId, buildDefaultVariantPayload(productForm));
      }

      await fetchProducts();
      return updatedProduct;
    } catch (updateProductError) {
      notifyMutationError(updateProductError);
      throw updateProductError;
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
      return true;
    } catch (deleteProductError) {
      if (deleteProductError?.status === 409) {
        notifyBundleComponentDeleteError();
        return false;
      }
      notifyMutationError(deleteProductError);
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
    forbidden,
    refetch: fetchProducts,
  };
}
