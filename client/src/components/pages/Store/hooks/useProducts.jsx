"use client";
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';
import { useUpload } from "@/components/hooks/useUpload";

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { upload, isUploading } = useUpload();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient("/products");

      if (Array.isArray(res)) {
        setProducts(res);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err);
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

    await apiClient("/products", {
      method: "POST",
      body: {
        SKU: product.productSKU,
        name: product.productName,
        description: product.productDescription || null,
        image_url: uploadedUrl,
        cost_cents: priceCents,
        category_id: product.productCategory,
        quantity: Number.isFinite(quantityNumber) ? quantityNumber : 0,
        price_cents: priceCents,
      },
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

    await apiClient(`/products/${product.productId}`, {
      method: "PUT",
      body: {
        id: product.productId,
        SKU: product.productSKU,
        name: product.productName,
        description: product.productDescription || null,
        image_url: uploadedUrl,
        cost_cents: priceCents,
        category_id: product.productCategory,
        quantity: Number.isFinite(quantityNumber) ? quantityNumber : 0,
        price_cents: priceCents,
      },
      notShowError: false,
    });

    await fetchProducts();
  };

  const deleteProduct = async (product) => {
    await apiClient(`/products/${product.id}`, {
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
