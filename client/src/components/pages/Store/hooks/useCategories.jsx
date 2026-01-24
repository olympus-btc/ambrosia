"use client";
import { useState, useEffect, useCallback } from "react";

import { apiClient } from "@/services/apiClient";

export function useCategories(type = "product") {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient(`/categories?type=${type}`);

      if (Array.isArray(res)) {
        setCategories(res);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  const createCategory = useCallback(
    async (name) => {
      const response = await apiClient("/categories", {
        method: "POST",
        body: { name, type },
        notShowError: false,
      });

      await fetchCategories();
      return response?.id;
    },
    [fetchCategories, type],
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    createCategory,
    loading,
    error,
    refetch: fetchCategories,
  };
}
