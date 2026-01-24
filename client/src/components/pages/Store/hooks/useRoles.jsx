"use client";
import { useState, useEffect, useCallback } from "react";

import { apiClient } from "@/services/apiClient";

export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient("/roles");
      if (res === null) {
        setRoles([]);
      } else {
        setRoles(res);
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRoles = async (role) => {
    try {
      const updateRoleResponse = await apiClient(`/roles/${user.userId}`, {
        method: "PUT",
        body: role,
      });

      await fetchRoles();
      return updateRoleResponse;
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);
  return {
    roles,
    updateRoles,
    loading,
    error,
    refetch: fetchRoles,
  };
}
