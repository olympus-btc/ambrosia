"use client";
import { useState, useEffect, useCallback } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const roles = await httpClient("/roles");
      const rolesData = await parseJsonResponse(roles, []);

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

  const updateRoles = useCallback(async (role) => {
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
  }, [fetchRoles]);

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
        const createRole = await httpClient("/roles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(roleRequestBody),
        });
        const createdRoleData = await parseJsonResponse(createRole, []);
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
      await updateRoles(roleId, {
        role: name,
        isAdmin,
        ...(password ? { password } : {}),
      });
      await assignPermissions(roleId, permissions);
      await fetchRoles();
    },
    [assignPermissions, fetchRoles, updateRoles],
  );

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
    assignPermissions,
    updateRoleWithPermissions,
    getRolePermissions,
    updateRoles,
    loading,
    error,
    refetch: fetchRoles,
  };
}
