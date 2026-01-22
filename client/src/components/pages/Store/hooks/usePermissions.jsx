"use client";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/services/apiClient";

export function usePermissions() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient("/permissions");
      setPermissions(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Error fetching permissions:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return { permissions, loading, error, refetch: fetchPermissions };
}
