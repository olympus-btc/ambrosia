"use client";
import { useState, useEffect, useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { httpClient, parseJsonResponse } from "@/lib/http";

async function buildHttpRequestError(response, fallbackMessage) {
  const responsePayload = await parseJsonResponse(response, null);
  const requestError = new Error(fallbackMessage);
  requestError.status = response.status;
  requestError.responseMessage = responsePayload?.message;
  return requestError;
}

function isLastAdminConflict(requestError) {
  return requestError?.status === 409 && requestError?.responseMessage?.includes("last admin");
}

export function useUsers() {
  const t = useTranslations("users");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const showGenericMutationErrorToast = useCallback(() => {
    addToast({
      title: t("toasts.genericErrorTitle"),
      description: t("toasts.genericErrorDescription"),
      color: "danger",
    });
  }, [t]);

  const showUserConflictToast = useCallback((requestError, fallbackConflictToast) => {
    if (isLastAdminConflict(requestError)) {
      addToast({
        title: t("toasts.lastAdminTitle"),
        description: t("toasts.lastAdminDescription"),
        color: "warning",
      });
      return;
    }

    addToast(fallbackConflictToast);
  }, [t]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const users = await httpClient("/users");
      const usersData = await parseJsonResponse(users, []);

      if (usersData === null) {
        setUsers([]);
      } else {
        setUsers(usersData);
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
        throw await buildHttpRequestError(updateUserResponse, "Error updating user");
      }

      await fetchUsers();

      const updatedUserData = await parseJsonResponse(updateUserResponse, null);

      return updatedUserData;
    } catch (requestError) {
      if (requestError?.status === 409) {
        showUserConflictToast(requestError, {
          title: t("toasts.duplicateNameTitle"),
          description: t("toasts.duplicateNameDescription"),
          color: "danger",
        });
        return;
      }

      showGenericMutationErrorToast();
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
        throw await buildHttpRequestError(createUserResponse, "Error adding user");
      }

      await fetchUsers();
      return createUserResponse;
    } catch (requestError) {
      if (requestError?.status === 409) {
        showUserConflictToast(requestError, {
          title: t("toasts.duplicateNameTitle"),
          description: t("toasts.duplicateNameDescription"),
          color: "danger",
        });
        return;
      }

      showGenericMutationErrorToast();
    }
  };

  const deleteUser = async (userId) => {
    try {
      const deleteUserResponse = await httpClient(`/users/${userId}`, {
        method: "DELETE",
      });

      if (deleteUserResponse.ok === false) {
        throw await buildHttpRequestError(deleteUserResponse, "Error deleting user");
      }

      await fetchUsers();
      return deleteUserResponse;
    } catch (requestError) {
      if (requestError?.status === 409) {
        showUserConflictToast(requestError, {
          title: t("toasts.lastUserTitle"),
          description: t("toasts.lastUserDescription"),
          color: "warning",
        });
        return;
      }

      showGenericMutationErrorToast();
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
    refetch: fetchUsers,
  };
}
