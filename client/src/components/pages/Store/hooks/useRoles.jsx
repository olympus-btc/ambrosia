"use client";
import { useState, useEffect, useCallback } from "react";

import { httpClient } from "@/lib/http/httpClient";

export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const roles = await httpClient("/roles");

      const rolesData = await roles.json();

      if (rolesData === null) {
        setRoles([]);
      } else {
        setRoles(rolesData);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRoles = async (role) => {
    try {
      const updateRoleResponse = await httpClient(`/roles/${user.userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(role),
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
