"use client";
import { useState, useEffect, useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

import { buildParsedHttpError } from "../utils/buildHttpError";

function isLastAdminConflict(requestError) {
  return requestError?.status === 409 && requestError?.responseMessage?.includes("last admin");
}

function isAdminPrivilegesRequired(requestError) {
  return requestError?.status === 403 && requestError?.responseMessage === "Admin privileges required";
}

export function useUsers({ skipForbiddenRedirect = false } = {}) {
  const usersTranslations = useTranslations("users");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const showGenericMutationErrorToast = useCallback(() => {
    addToast({
      title: usersTranslations("toasts.genericErrorTitle"),
      description: usersTranslations("toasts.genericErrorDescription"),
      color: "danger",
    });
  }, [usersTranslations]);

  const showAdminRequiredToast = useCallback(() => {
    addToast({
      title: usersTranslations("toasts.adminRequiredTitle"),
      description: usersTranslations("toasts.adminRequiredDescription"),
      color: "warning",
    });
  }, [usersTranslations]);

  const showUserConflictToast = useCallback((requestError, fallbackConflictToast) => {
    if (isLastAdminConflict(requestError)) {
      addToast({
        title: usersTranslations("toasts.lastAdminTitle"),
        description: usersTranslations("toasts.lastAdminDescription"),
        color: "warning",
      });
      return;
    }

    addToast(fallbackConflictToast);
  }, [usersTranslations]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const usersResponse = await httpClient("/users", { skipForbiddenRedirect });
      setForbidden(usersResponse.status === 403);
      if (!usersResponse.ok) return;
      const usersData = await parseJsonResponse(usersResponse, []);
      setUsers(toArray(usersData));
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [skipForbiddenRedirect]);

  const updateUser = async (user) => {
    try {
      const updateUserPayload = {
        name: user.userName,
        roleId: user.userRole,
        email: user.userEmail,
        phone: user.userPhone,
      };

      if (user.userPin && user.userPin.trim().length > 0) {
        updateUserPayload.pin = user.userPin;
      }

      const updateUserResponse = await httpClient(`/users/${user.userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateUserPayload),
      });

      if (updateUserResponse.ok === false) {
        throw await buildParsedHttpError(updateUserResponse, "Error updating user");
      }

      await fetchUsers();

      const updatedUserData = await parseJsonResponse(updateUserResponse, null);

      return updatedUserData;
    } catch (requestError) {
      if (isAdminPrivilegesRequired(requestError)) {
        showAdminRequiredToast();
        throw requestError;
      }
      if (requestError?.status === 409) {
        showUserConflictToast(requestError, {
          title: usersTranslations("toasts.duplicateNameTitle"),
          description: usersTranslations("toasts.duplicateNameDescription"),
          color: "danger",
        });
        throw requestError;
      }

      showGenericMutationErrorToast();
      throw requestError;
    }
  };

  const addUser = async (user) => {
    try {
      const createUserResponse = await httpClient(`/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user.userName,
          pin: user.userPin,
          role: user.userRole,
          email: user.userEmail,
          phone: user.userPhone,
        }),
      });

      if (createUserResponse.ok === false) {
        throw await buildParsedHttpError(createUserResponse, "Error adding user");
      }

      await fetchUsers();
      return createUserResponse;
    } catch (requestError) {
      if (isAdminPrivilegesRequired(requestError)) {
        showAdminRequiredToast();
        throw requestError;
      }
      if (requestError?.status === 409) {
        showUserConflictToast(requestError, {
          title: usersTranslations("toasts.duplicateNameTitle"),
          description: usersTranslations("toasts.duplicateNameDescription"),
          color: "danger",
        });
        throw requestError;
      }

      showGenericMutationErrorToast();
      throw requestError;
    }
  };

  const deleteUser = async (userId) => {
    try {
      const deleteUserResponse = await httpClient(`/users/${userId}`, {
        method: "DELETE",
      });

      if (deleteUserResponse.ok === false) {
        throw await buildParsedHttpError(deleteUserResponse, "Error deleting user");
      }

      await fetchUsers();
      return deleteUserResponse;
    } catch (requestError) {
      if (requestError?.status === 409) {
        showUserConflictToast(requestError, {
          title: usersTranslations("toasts.lastUserTitle"),
          description: usersTranslations("toasts.lastUserDescription"),
          color: "warning",
        });
        throw requestError;
      }

      showGenericMutationErrorToast();
      throw requestError;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  return {
    users,
    updateUser,
    addUser,
    deleteUser,
    loading,
    error,
    forbidden,
    refetch: fetchUsers,
  };
}
