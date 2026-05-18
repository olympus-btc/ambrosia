"use client";
import { useMemo } from "react";

import { useAuth } from "@/hooks/auth/useAuth";

import { getAvailableFeatures, getAvailableNavigation } from "../lib/features";
import { useConfigurations } from "../providers/configurations/configurationsProvider";

export function useNavigation() {
  const { isAuth, user, permissions, logout, isLoading } = useAuth();

  const isAdmin = user?.isAdmin || false;
  const { businessType } = useConfigurations();

  const availableFeatures = useMemo(() => {
    if (isLoading) return {};
    return getAvailableFeatures(isAuth, isAdmin, permissions, businessType);
  }, [isAuth, isAdmin, isLoading, permissions, businessType]);

  const availableNavigation = useMemo(() => {
    if (isLoading) return [];
    return getAvailableNavigation(isAuth, isAdmin, permissions, businessType);
  }, [isAuth, isAdmin, isLoading, permissions, businessType]);

  return {
    availableFeatures,
    availableNavigation,
    isAuth,
    isAdmin,
    isLoading,
    user,
    logout,
  };
}
