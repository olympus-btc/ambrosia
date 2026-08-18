"use client";
import { useCallback, useEffect, useState } from "react";

import { toArray } from "@/components/utils/array";
import { usePermission } from "@/hooks/usePermission";
import { httpClient, parseJsonResponse } from "@/lib/http";

export function usePermissions({ enabled = true } = {}) {
  const canReadPermissions = usePermission({ allOf: ["permissions_read"] });
  const shouldFetch = enabled && canReadPermissions;
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(shouldFetch);
  const [error, setError] = useState(null);

  const fetchPermissions = useCallback(async () => {
    if (!shouldFetch) {
      setPermissions([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const permissionsRequest = await httpClient("/permissions");

      const permissionsData = await parseJsonResponse(permissionsRequest);
      setPermissions(toArray(permissionsData));
    } catch (permissionsLoadError) {
      console.error("Error fetching permissions:", permissionsLoadError);
      setError(permissionsLoadError);
    } finally {
      setLoading(false);
    }
  }, [shouldFetch]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return { permissions, loading, error, refetch: fetchPermissions };
}
