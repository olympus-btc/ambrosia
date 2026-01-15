"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import { AuthContext } from "../modules/auth/AuthProvider";
import { getHomeRoute } from "../lib/getHomeRoute";
import LoadingCard from "../components/LoadingCard";
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
      router.replace("/auth");
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

  return (
    <LoadingCard
      message={
        isLoading ||
        (isAuth &&
          (isConfigLoading ||
            (!businessType && !hasRequestedConfigRef.current)))
          ? "Verificando autenticación y configuración..."
          : "Redirigiendo..."
      }
    />
  );
}
