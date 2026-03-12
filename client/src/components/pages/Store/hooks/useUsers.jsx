"use client";
import { useState, useEffect, useCallback } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { httpClient, parseJsonResponse } from "@/lib/http";

export function useUsers() {
  const t = useTranslations("users");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
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
      const body = {
        name: user.userName,
        roleId: user.userRole,
        email: user.userEmail,
        phone: user.userPhone,
      };

      if (user.userPin && user.userPin.trim().length > 0) {
        body.pin = user.userPin;
      }

      const updateUser = await httpClient(`/users/${user.userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      await fetchUsers();

      const updatedDataUser = await parseJsonResponse(updateUser, null);

      return updatedDataUser;
    } catch (error) {
      if (error?.status === 409) {
        addToast({
          title: t("toasts.duplicateNameTitle"),
          description: t("toasts.duplicateNameDescription"),
          color: "danger",
        });
      } else {
        addToast({
          title: t("toasts.genericErrorTitle"),
          description: t("toasts.genericErrorDescription"),
          color: "danger",
        });
      }
    }
  };

  const addUser = async (user) => {
    try {
      const addUserResponse = await httpClient(`/users`, {
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

      await fetchUsers();
      return addUserResponse;
    } catch (error) {
      if (error?.status === 409) {
        addToast({
          title: t("toasts.duplicateNameTitle"),
          description: t("toasts.duplicateNameDescription"),
          color: "danger",
        });
      } else {
        addToast({
          title: t("toasts.genericErrorTitle"),
          description: t("toasts.genericErrorDescription"),
          color: "danger",
        });
      }
    }
  };

  const deleteUser = async (userId) => {
    try {
      const deleteUserResponse = await httpClient(`/users/${userId}`, {
        method: "DELETE",
      });

      await fetchUsers();
      return deleteUserResponse;
    } catch (error) {
      if (error?.status === 409) {
        addToast({
          title: t("toasts.lastUserTitle"),
          description: t("toasts.lastUserDescription"),
          color: "warning",
        });
      } else {
        addToast({
          title: t("toasts.genericErrorTitle"),
          description: t("toasts.genericErrorDescription"),
          color: "danger",
        });
      }
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
