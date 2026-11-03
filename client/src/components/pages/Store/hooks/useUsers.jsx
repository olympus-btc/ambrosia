"use client";
import { useState, useEffect, useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

import { buildParsedHttpError } from "../utils/buildHttpError";
import { isAdminPrivilegesRequired, isConflict, isCurrentUserPinIncorrect, isLastAdminConflict, resolveMutationErrorToast, translateToast } from "../utils/mutationErrorToast";

export function useUsers({ skipForbiddenRedirect = false } = {}) {
  const usersTranslations = useTranslations("users");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const genericMutationErrorToast = translateToast(usersTranslations, "toasts.genericErrorTitle", "toasts.genericErrorDescription", "danger");

  const adminPrivilegesRequiredRule = {
    when: isAdminPrivilegesRequired,
    toast: translateToast(usersTranslations, "toasts.adminRequiredTitle", "toasts.adminRequiredDescription", "warning"),
  };

  const currentUserPinIncorrectRule = {
    when: isCurrentUserPinIncorrect,
    toast: translateToast(usersTranslations, "toasts.currentUserPinIncorrectTitle", "toasts.currentUserPinIncorrectDescription", "danger"),
  };

  const lastAdminConflictRule = {
    when: isLastAdminConflict,
    toast: translateToast(usersTranslations, "toasts.lastAdminTitle", "toasts.lastAdminDescription", "warning"),
  };

  const createOrUpdateUserErrorRules = [
    adminPrivilegesRequiredRule,
    currentUserPinIncorrectRule,
    lastAdminConflictRule,
    {
      when: isConflict,
      toast: translateToast(usersTranslations, "toasts.duplicateNameTitle", "toasts.duplicateNameDescription", "danger"),
    },
  ];

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
        currentUserPin: user.currentUserPin,
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
        skipForbiddenRedirect: true,
      });

      if (updateUserResponse.ok === false) {
        throw await buildParsedHttpError(updateUserResponse, "Error updating user");
      }

      await fetchUsers();

      const updatedUserData = await parseJsonResponse(updateUserResponse, null);

      return updatedUserData;
    } catch (requestError) {
      addToast(resolveMutationErrorToast(requestError, createOrUpdateUserErrorRules, genericMutationErrorToast));
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
          user: {
            name: user.userName,
            pin: user.userPin,
            role: user.userRole,
            email: user.userEmail,
            phone: user.userPhone,
          },
          currentUserPin: user.currentUserPin,
        }),
        skipForbiddenRedirect: true,
      });

      if (createUserResponse.ok === false) {
        throw await buildParsedHttpError(createUserResponse, "Error adding user");
      }

      await fetchUsers();
      return createUserResponse;
    } catch (requestError) {
      addToast(resolveMutationErrorToast(requestError, createOrUpdateUserErrorRules, genericMutationErrorToast));
      throw requestError;
    }
  };

  const deleteUser = async (userId, currentUserPin) => {
    try {
      const deleteUserResponse = await httpClient(`/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentUserPin }),
        skipForbiddenRedirect: true,
      });

      if (deleteUserResponse.ok === false) {
        throw await buildParsedHttpError(deleteUserResponse, "Error deleting user");
      }

      await fetchUsers();
      return deleteUserResponse;
    } catch (requestError) {
      addToast(resolveMutationErrorToast(requestError, [
        currentUserPinIncorrectRule,
        lastAdminConflictRule,
        {
          when: isConflict,
          toast: translateToast(usersTranslations, "toasts.lastUserTitle", "toasts.lastUserDescription", "warning"),
        },
      ], genericMutationErrorToast));
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
