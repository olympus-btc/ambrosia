"use client";
import { useCallback, useEffect, useState } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

export function usePermissions() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const permissionsRequest = await httpClient("/permissions");

      const permissionsData = await parseJsonResponse(permissionsRequest);
      setPermissions(toArray(permissionsData));
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return { permissions, loading, error, refetch: fetchPermissions };
}
