"use client";
import { useState, useEffect, useCallback } from "react";

import { useUpload } from "@/components/hooks/useUpload";
import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { upload, isUploading } = useUpload();

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
    let uploadedUrl = product.productImageUrl || null;
    if (product.productImage instanceof File) {
      const uploads = await upload([product.productImage]);
      uploadedUrl = uploads?.[0]?.url || uploads?.[0]?.path || null;
    }

    const priceNumber = Number(product.productPrice ?? 0);
    const priceCents = Number.isFinite(priceNumber)
      ? Math.round(priceNumber * 100)
      : 0;
    const quantityNumber = Number(product.productStock ?? 0);
    const minStockNumber = Number(product.productMinStock ?? 0);
    const maxStockNumber = Number(product.productMaxStock ?? 0);

    await httpClient("/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        SKU: product.productSKU,
        name: product.productName,
        description: product.productDescription || null,
        image_url: uploadedUrl,
        cost_cents: priceCents,
        category_ids: toArray(product.productCategories),
        quantity: Number.isFinite(quantityNumber) ? quantityNumber : 0,
        min_stock_threshold: Number.isFinite(minStockNumber) ? minStockNumber : 0,
        max_stock_threshold: Number.isFinite(maxStockNumber) ? maxStockNumber : 0,
        price_cents: priceCents,
      }),
      notShowError: false,
    });

    await fetchProducts();
  };

  const updateProduct = async (product) => {
    let uploadedUrl = product.productImageUrl || null;
    if (product.productImage instanceof File) {
      const uploads = await upload([product.productImage]);
      uploadedUrl = uploads?.[0]?.url || uploads?.[0]?.path || null;
    } else if (product.productImageRemoved) {
      uploadedUrl = null;
    }

    const priceNumber = Number(product.productPrice ?? 0);
    const priceCents = Number.isFinite(priceNumber)
      ? Math.round(priceNumber * 100)
      : 0;
    const quantityNumber = Number(product.productStock ?? 0);
    const minStockNumber = Number(product.productMinStock ?? 0);
    const maxStockNumber = Number(product.productMaxStock ?? 0);

    await httpClient(`/products/${product.productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: product.productId,
        SKU: product.productSKU,
        name: product.productName,
        description: product.productDescription || null,
        image_url: uploadedUrl,
        cost_cents: priceCents,
        category_ids: toArray(product.productCategories),
        quantity: Number.isFinite(quantityNumber) ? quantityNumber : 0,
        min_stock_threshold: Number.isFinite(minStockNumber) ? minStockNumber : 0,
        max_stock_threshold: Number.isFinite(maxStockNumber) ? maxStockNumber : 0,
        price_cents: priceCents,
      }),
      notShowError: false,
    });

    await fetchProducts();
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
