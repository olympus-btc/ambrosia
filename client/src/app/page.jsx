"use client";

import { useContext, useEffect, useRef } from "react";

import { useRouter } from "next/navigation";

import LoadingCard from "../components/LoadingCard";
import { getHomeRoute } from "../lib/getHomeRoute";
import { AuthContext } from "../modules/auth/AuthProvider";
import { useConfigurations } from "../providers/configurations/configurationsProvider";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, isAuth } = useContext(AuthContext);
  const {
    businessType,
    isLoading: isConfigLoading,
    refreshConfig,
  } = useConfigurations();
  const hasRequestedConfigRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuth) {
      window.location.replace("/auth");
      return;
    }

    if (isConfigLoading) return;

    if (isAuth && !businessType && !hasRequestedConfigRef.current) {
      hasRequestedConfigRef.current = true;
      refreshConfig?.();
      return;
    }

    const homeRoute = getHomeRoute(user, businessType);
    router.replace(homeRoute);
  }, [user, isAuth, isLoading, isConfigLoading, router, businessType, refreshConfig]);

  return <LoadingCard />;
}
