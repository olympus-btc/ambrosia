"use client";
import { useState, useEffect, useCallback } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

export function useCategories(type = "product") {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await httpClient(`/categories?type=${type}`);
      const data = await parseJsonResponse(response, []);
      setCategories(toArray(data));
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  const createCategory = useCallback(
    async (name, categoryType) => {
      const response = await httpClient("/categories", {
        method: "POST",
        body: JSON.stringify({ name, type: categoryType || type }),
        headers: {
          "Content-Type": "application/json",
        },
        notShowError: false,
      });

      await fetchCategories();
      return response?.id;
    },
    [fetchCategories, type],
  );

  const updateCategory = useCallback(
    async (category) => {
      await httpClient(`/categories/${category.categoryId}`, {
        method: "PUT",
        body: JSON.stringify({ name: category.categoryName, type: "product" }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      await fetchCategories();
    },
    [fetchCategories],
  );

  const deleteCategory = useCallback(
    async (categoryId) => {
      await httpClient(`/categories/${categoryId}`, {
        method: "DELETE",
      });

      await fetchCategories();
    },
    [fetchCategories],
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
    loading,
    error,
    refetch: fetchCategories,
  };
}
