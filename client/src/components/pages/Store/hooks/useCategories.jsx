"use client";
import { useState, useEffect, useCallback } from "react";

import { httpClient } from "../../../../lib/http/httpClient";

export function useCategories(type = "product") {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await httpClient(`/categories?type=${type}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  const createCategory = useCallback(
    async (name) => {
      const response = await httpClient("/categories", {
        method: "POST",
        body: JSON.stringify({ name, type }),
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
