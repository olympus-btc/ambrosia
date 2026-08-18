"use client";
import { useState, useEffect, useCallback } from "react";

import { toArray } from "@/components/utils/array";
import { usePermission } from "@/hooks/usePermission";
import { httpClient, parseJsonResponse } from "@/lib/http";
import { useFetchList } from "@/lib/http/useFetchList";

import { buildParsedHttpError } from "../utils/buildHttpError";

export function useCategories(type = "product") {
  const { fetchList } = useFetchList();
  const canRead = usePermission({ allOf: ["categories_read"] });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(canRead);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    setError(null);

    try {
      const categoryList = await fetchList(`/categories?type=${type}`);
      if (categoryList === null) return;
      setCategories(toArray(categoryList));
    } catch (categoryLoadError) {
      console.error("Error fetching categories:", categoryLoadError);
      setError(categoryLoadError);
    } finally {
      setLoading(false);
    }
  }, [canRead, fetchList, type]);

  const createCategory = useCallback(
    async (name, categoryType) => {
      const createCategoryResponse = await httpClient("/categories", {
        method: "POST",
        body: JSON.stringify({ name, type: categoryType || type }),
        headers: {
          "Content-Type": "application/json",
        },
        notShowError: false,
      });
      if (createCategoryResponse.ok === false) {
        throw await buildParsedHttpError(createCategoryResponse, "Error creating category");
      }
      const createdCategory = await parseJsonResponse(createCategoryResponse, {});

      await fetchCategories();
      return createdCategory?.id;
    },
    [fetchCategories, type],
  );

  const updateCategory = useCallback(
    async (category) => {
      const updateCategoryResponse = await httpClient(`/categories/${category.categoryId}`, {
        method: "PUT",
        body: JSON.stringify({ name: category.categoryName, type: "product" }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (updateCategoryResponse.ok === false) {
        throw await buildParsedHttpError(updateCategoryResponse, "Error updating category");
      }

      await fetchCategories();
    },
    [fetchCategories],
  );

  const deleteCategory = useCallback(
    async (categoryId) => {
      const deleteCategoryResponse = await httpClient(`/categories/${categoryId}?type=${type}`, {
        method: "DELETE",
      });
      if (deleteCategoryResponse.ok === false) {
        throw await buildParsedHttpError(deleteCategoryResponse, "Error deleting category");
      }

      await fetchCategories();
    },
    [fetchCategories, type],
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
    forbidden: !canRead,
    refetch: fetchCategories,
  };
}
