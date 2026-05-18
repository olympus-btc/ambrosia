"use client";
import { useMemo } from "react";

import { useAuth } from "@/hooks/auth/useAuth";

import { getAvailableFeatures, getAvailableNavigation } from "../lib/features";
import { useConfigurations } from "../providers/configurations/configurationsProvider";

export function useNavigation() {
  const { isAuth, user, permissions, logout, isLoading } = useAuth();

  const isAdmin = user?.isAdmin || false;
  const { businessType } = useConfigurations();

  const availableFeatures = useMemo(() => getAvailableFeatures(isAuth, isAdmin, permissions, businessType), [isAuth, isAdmin, permissions, businessType]);

  const availableNavigation = useMemo(() => getAvailableNavigation(isAuth, isAdmin, permissions, businessType), [isAuth, isAdmin, permissions, businessType]);

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
