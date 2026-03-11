"use client";
import { useState, useEffect, useCallback } from "react";

import { toArray } from "@/components/utils/array";
import { usePermission } from "@/hooks/usePermission";
import { httpClient, parseJsonResponse } from "@/lib/http";

export function useRoles() {
  const [roles, setRoles] = useState([]);
  const canRead = usePermission({ allOf: ["roles_read"] });
  const [loading, setLoading] = useState(canRead);
  const [error, setError] = useState(null);

  const fetchRoles = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    setError(null);

    try {
      const rolesRequest = await httpClient("/roles");
      const rolesData = await parseJsonResponse(rolesRequest, []);
      setRoles(toArray(rolesData));
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  const updateRole = useCallback(async (roleId, role) => {
    try {
      const updateRoleRequest = await httpClient(`/roles/${roleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(role),
      });
      return updateRoleRequest;
    } catch (error) {
      console.error("Error updating role:", error);
      throw error;
    }
  }, []);

  const assignPermissions = useCallback(async (roleId, permissions = []) => {
    if (!roleId) return;
    try {
      await httpClient(`/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permissions }),
      });
    } catch (error) {
      console.error("Error assigning permissions:", error);
      throw error;
    }
  }, []);

  const createRole = useCallback(
    async ({ name, password, isAdmin = false, permissions = [] }) => {
      try {
        const roleRequestBody = { role: name, isAdmin };
        if (password) roleRequestBody.password = password;
        const createRoleRequest = await httpClient("/roles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(roleRequestBody),
        });
        const createdRoleData = await parseJsonResponse(createRoleRequest, []);
        const createdRoleId = createdRoleData?.id || createdRoleData?.roleId;
        if (permissions.length > 0) {
          await assignPermissions(createdRoleId, permissions);
        }
        await fetchRoles();
        return createdRoleId;
      } catch (error) {
        console.error("Error creating role:", error);
        throw error;
      }
    },
    [assignPermissions, fetchRoles],
  );

  const updateRoleWithPermissions = useCallback(
    async (roleId, { name, isAdmin = false, password, permissions = [] }) => {
      if (!roleId) return;
      await updateRole(roleId, {
        role: name,
        isAdmin,
        ...(password ? { password } : {}),
      });
      await assignPermissions(roleId, permissions);
      await fetchRoles();
    },
    [assignPermissions, fetchRoles, updateRole],
  );

  const deleteRole = useCallback(async (roleId) => {
    await httpClient(`/roles/${roleId}`, { method: "DELETE" });
    await fetchRoles();
  }, [fetchRoles]);

  const getRolePermissions = useCallback(async (roleId) => {
    if (!roleId) return [];
    try {
      const rolePermissionsResponse = await httpClient(`/roles/${roleId}/permissions`);

      const rolePermissionsData = await parseJsonResponse(rolePermissionsResponse);

      return toArray(rolePermissionsData, []);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    roles,
    createRole,
    deleteRole,
    assignPermissions,
    updateRoleWithPermissions,
    getRolePermissions,
    loading,
    error,
    refetch: fetchRoles,
  };
}
