"use client";
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient("/roles");
      setRoles(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Error fetching roles:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const assignPermissions = useCallback(async (roleId, permissions = []) => {
    if (!roleId) return;
    try {
      await apiClient(`/roles/${roleId}/permissions`, {
        method: "PUT",
        body: { permissions },
      });
    } catch (err) {
      console.error("Error assigning permissions:", err);
      throw err;
    }
  }, []);

  const createRole = useCallback(
    async ({ name, password, isAdmin = false, permissions = [] }) => {
      try {
        const body = { role: name, isAdmin };
        if (password) body.password = password;
        const res = await apiClient("/roles", { method: "POST", body });
        const roleId = res?.id || res?.roleId;
        if (permissions.length > 0) {
          await assignPermissions(roleId, permissions);
        }
        await fetchRoles();
        return roleId;
      } catch (err) {
        console.error("Error creating role:", err);
        throw err;
      }
    },
    [assignPermissions, fetchRoles],
  );

  const updateRoles = async (roleId, role) => {
    try {
      const updateRoleResponse = await apiClient(`/roles/${roleId}`, {
        method: "PUT",
        body: role,
      });

      await fetchRoles();
      return updateRoleResponse;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

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
      const res = await apiClient(`/roles/${roleId}/permissions`);
      return Array.isArray(res) ? res : [];
    } catch (err) {
      console.error("Error fetching role permissions:", err);
      throw err;
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
