"use client";
import { useState, useEffect, useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useUpload } from "@/components/hooks/useUpload";
import { toArray } from "@/components/utils/array";
import { toFiniteNumber } from "@/components/utils/numberParsers";
import { httpClient, parseJsonResponse } from "@/lib/http";
import { useFetchList } from "@/lib/http/useFetchList";

import { resolveImageUrl } from "../Products/utils/resolveImageUrl";

import { useProductVariants } from "./useProductVariants";

export function useProducts() {
  const productsTranslations = useTranslations("products");
  const { fetchList } = useFetchList();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { upload, isUploading } = useUpload();
  const { updateVariant } = useProductVariants();

  const normalizeSku = (productSku) => productSku?.trim() || null;

  const buildRequestPayload = (productForm, imageUrl, { includeId = false } = {}) => {
    const hasVariants = productForm.hasVariants ?? false;
    return {
      ...(includeId ? { id: productForm.productId } : {}),
      SKU: normalizeSku(productForm.productSKU),
      name: productForm.productName,
      description: productForm.productDescription || null,
      imageUrl,
      categoryIds: toArray(productForm.productCategories),
      hasVariants,
      ...(!hasVariants ? {
        priceCents: Math.round(toFiniteNumber(productForm.productPrice) * 100),
        quantity: toFiniteNumber(productForm.productStock),
      } : {}),
      minStockThreshold: toFiniteNumber(productForm.productMinStock),
      maxStockThreshold: toFiniteNumber(productForm.productMaxStock),
    };
  };

  const buildDefaultVariantPayload = (productForm) => ({
    SKU: normalizeSku(productForm.productSKU),
    priceCents: Math.round(toFiniteNumber(productForm.productPrice) * 100),
    quantity: toFiniteNumber(productForm.productStock),
    isActive: true,
  });

  const buildHttpError = (response, payload) => ({
    status: response.status,
    message: payload?.message || "Request failed",
  });

  const notifyMutationError = (error) => {
    if (error?.status === 409) {
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
    } catch (fetchProductsError) {
      console.error("Error fetching products:", fetchProductsError);
      setError(fetchProductsError);
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  const addProduct = async (productForm) => {
    try {
      const uploadedImageUrl = await resolveImageUrl(productForm.productImage, productForm.productImageUrl || null, upload);

      const addProductResponse = await httpClient("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestPayload(productForm, uploadedImageUrl)),
        notShowError: false,
      });

      const createdProduct = await validateProductResponse(addProductResponse);

      await fetchProducts();
      return createdProduct;
    } catch (addProductError) {
      notifyMutationError(addProductError);
      throw addProductError;
    }
  };

  const updateProduct = async (productForm) => {
    try {
      let uploadedImageUrl;
      if (productForm.productImageRemoved) {
        uploadedImageUrl = null;
      } else {
        uploadedImageUrl = await resolveImageUrl(productForm.productImage, productForm.productImageUrl || null, upload);
      }

      const updateProductResponse = await httpClient(`/products/${productForm.productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestPayload(productForm, uploadedImageUrl, { includeId: true })),
        notShowError: false,
      });

      const updatedProduct = await validateProductResponse(updateProductResponse);

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

  const deleteProduct = async (productToDelete) => {
    try {
      const deleteProductResponse = await httpClient(`/products/${productToDelete.id}`, {
        method: "DELETE",
        notShowError: false,
      });
      await validateProductResponse(deleteProductResponse);
      await fetchProducts();
      return true;
    } catch (deleteProductError) {
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
    refetch: fetchProducts,
  };
}
