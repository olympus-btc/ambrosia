"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import LoadingCard from "@/components/LoadingCard";
import { useAuth } from "@/hooks/auth/useAuth";
import { getHomeRoute } from "@/lib/getHomeRoute";
import { useConfigurations } from "@/providers/configurations/configurationsProvider";

export function Home() {
  const router = useRouter();
  const { user, isLoading, isAuth } = useAuth();
  const { businessType, isLoading: isConfigLoading } = useConfigurations();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuth) {
      window.location.replace("/auth");
      return;
    }

    if (isConfigLoading) return;

    const homeRoute = getHomeRoute(user, businessType);
    router.replace(homeRoute);
  }, [user, isAuth, isLoading, isConfigLoading, router, businessType]);

  return <LoadingCard />;
}
