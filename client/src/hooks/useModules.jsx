"use client";
import { useMemo } from "react";

import { useAuth } from "@/hooks/auth/useAuth";

import { getAvailableModules, getAvailableNavigation, hasAccessToRoute } from "../lib/modules";
import { useConfigurations } from "../providers/configurations/configurationsProvider";

export function useModules() {
  const { isAuth, user, permissions, logout, isLoading } = useAuth();

  const isAdmin = user?.isAdmin || false;
  const { businessType } = useConfigurations();

  const availableModules = useMemo(() => {
    if (isLoading) return {};
    return getAvailableModules(isAuth, isAdmin, permissions, businessType);
  }, [isAuth, isAdmin, isLoading, permissions, businessType]);

  const availableNavigation = useMemo(() => {
    if (isLoading) return [];
    return getAvailableNavigation(isAuth, isAdmin, permissions, businessType);
  }, [isAuth, isAdmin, isLoading, permissions, businessType]);

  const checkRouteAccess = (pathname) => hasAccessToRoute(pathname, isAuth, isAdmin, permissions, businessType);

  return {
    availableModules,
    availableNavigation,
    checkRouteAccess,
    isAuth,
    isAdmin,
    isLoading,
    user,
    logout,
  };
}
