"use client";
import { useState, useEffect, useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { toArray } from "@/components/utils/array";
import { usePermission } from "@/hooks/usePermission";
import { httpClient, parseJsonResponse } from "@/lib/http";
import { useFetchList } from "@/lib/http/useFetchList";

import { buildParsedHttpError } from "../utils/buildHttpError";
import { isAdminPrivilegesRequired, isConflict, isCurrentUserPinIncorrect, isLastAdminConflict, resolveMutationErrorToast, translateToast } from "../utils/mutationErrorToast";

export function useRoles() {
  const { fetchList } = useFetchList();
  const rolesTranslations = useTranslations("roles");
  const [roles, setRoles] = useState([]);
  const canRead = usePermission({ allOf: ["roles_read"] });
  const [loading, setLoading] = useState(canRead);

  const adminPrivilegesRequiredRule = {
    when: isAdminPrivilegesRequired,
    toast: translateToast(rolesTranslations, "actions.adminRequiredTitle", "actions.adminRequiredDescription", "warning"),
  };

  const currentUserPinIncorrectRule = {
    when: isCurrentUserPinIncorrect,
    toast: translateToast(rolesTranslations, "actions.currentUserPinIncorrectTitle", "actions.currentUserPinIncorrectDescription", "danger"),
  };

  const lastAdminConflictRule = {
    when: isLastAdminConflict,
    toast: translateToast(rolesTranslations, "actions.lastAdminErrorTitle", "actions.lastAdminErrorDescription", "warning"),
  };

  const fetchRoles = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);

    try {
      const rolesData = await fetchList("/roles");
      setRoles(toArray(rolesData));
    } catch (roleLoadError) {
      console.error("Error fetching roles:", roleLoadError);
    } finally {
      setLoading(false);
    }
  }, [canRead, fetchList]);

  const updateRole = async (roleId, role) => {
    try {
      const updateRoleRequest = await httpClient(`/roles/${roleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(role),
        skipForbiddenRedirect: true,
      });
      if (updateRoleRequest.ok === false) {
        throw await buildParsedHttpError(updateRoleRequest, "Error updating role");
      }
      return updateRoleRequest;
    } catch (updateRoleError) {
      console.error("Error updating role:", updateRoleError);
      addToast(resolveMutationErrorToast(updateRoleError, [
        adminPrivilegesRequiredRule,
        currentUserPinIncorrectRule,
        lastAdminConflictRule,
      ], translateToast(rolesTranslations, "actions.saveErrorTitle", "actions.saveErrorDescription", "danger")));
      throw updateRoleError;
    }
  };

  const createRole = async ({ name, isAdmin = false, permissions = [], currentUserPin }) => {
    try {
      const roleRequestBody = { role: name, isAdmin, permissions, currentUserPin };
      const createRoleRequest = await httpClient("/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(roleRequestBody),
        skipForbiddenRedirect: true,
      });
      if (createRoleRequest.ok === false) {
        throw await buildParsedHttpError(createRoleRequest, "Error creating role");
      }
      const createdRoleData = await parseJsonResponse(createRoleRequest, []);
      const createdRoleId = createdRoleData?.id || createdRoleData?.roleId;
      await fetchRoles();
      return createdRoleId;
    } catch (createRoleError) {
      console.error("Error creating role:", createRoleError);
      addToast(resolveMutationErrorToast(createRoleError, [
        adminPrivilegesRequiredRule,
        currentUserPinIncorrectRule,
        {
          when: isConflict,
          toast: translateToast(rolesTranslations, "actions.createConflictTitle", "actions.createConflictDescription", "warning"),
        },
      ], translateToast(rolesTranslations, "actions.createErrorTitle", "actions.createErrorDescription", "danger")));
      throw createRoleError;
    }
  };

  const updateRoleWithPermissions = async (roleId, { name, isAdmin = false, permissions = [], currentUserPin }) => {
    if (!roleId) return;
    await updateRole(roleId, {
      role: name,
      isAdmin,
      permissions,
      currentUserPin,
    });
    await fetchRoles();
  };

  const deleteRole = async (roleId, currentUserPin) => {
    try {
      const deleteRoleResponse = await httpClient(`/roles/${roleId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentUserPin }),
        skipForbiddenRedirect: true,
      });
      if (deleteRoleResponse.ok === false) {
        throw await buildParsedHttpError(deleteRoleResponse, "Error deleting role");
      }
      await fetchRoles();
    } catch (deleteRoleError) {
      console.error("Error deleting role:", deleteRoleError);
      addToast(resolveMutationErrorToast(deleteRoleError, [
        currentUserPinIncorrectRule,
        lastAdminConflictRule,
      ], translateToast(rolesTranslations, "actions.saveErrorTitle", "actions.deleteError", "danger")));
      throw deleteRoleError;
    }
  };

  const getRolePermissions = useCallback(async (roleId) => {
    if (!roleId) return [];
    try {
      const rolePermissionsResponse = await httpClient(`/roles/${roleId}/permissions`, { skipForbiddenRedirect: true });

      const rolePermissionsData = await parseJsonResponse(rolePermissionsResponse);

      return toArray(rolePermissionsData, []);
    } catch (rolePermissionsError) {
      console.error("Error fetching role permissions:", rolePermissionsError);
      throw rolePermissionsError;
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    roles,
    createRole,
    deleteRole,
    updateRoleWithPermissions,
    getRolePermissions,
    loading,
    refetch: fetchRoles,
  };
}
