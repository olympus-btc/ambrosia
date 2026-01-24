"use client";
import { useState, useEffect, useCallback } from "react";

import { apiClient } from "@/services/apiClient";

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient("/users");
      if (res === null) {
        setUsers([]);
      } else {
        setUsers(res);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = async (user) => {
    try {
      const body = {
        name: user.userName,
        role_id: user.userRole,
        email: user.userEmail,
        phone: user.userPhone,
      };

      if (user.userPin && user.userPin.trim().length > 0) {
        body.pin = user.userPin;
      }

      const updateUserResponse = await apiClient(`/users/${user.userId}`, {
        method: "PUT",
        body,
      });

      await fetchUsers();
      return updateUserResponse;
    } catch (error) {
      console.error(error);
    }
  };

  const addUser = async (user) => {
    try {
      const addUserResponse = await apiClient(`/users`, {
        method: "POST",
        body: {
          name: user.userName,
          pin: user.userPin,
          role: user.userRole,
          email: user.userEmail,
          phone: user.userPhone,
        },
      });

      await fetchUsers();
      return addUserResponse;
    } catch (error) {
      console.error(error);
    }
  };

  const deleteUser = async (userId) => {
    try {
      const deleteUserResponse = await apiClient(`/users/${userId}`, {
        method: "DELETE",
      });

      await fetchUsers();
      return deleteUserResponse;
    } catch (error) {
      console.error(error);
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
