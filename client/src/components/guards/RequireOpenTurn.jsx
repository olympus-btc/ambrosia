"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTurn } from "../../modules/cashier/useTurn";

export default function RequireOpenTurn({ children }) {
  const router = useRouter();
  const { openTurn, loading } = useTurn();

  useEffect(() => {
    if (!loading && !openTurn && autoRedirect) {
      router.replace("/open-turn");
    }
  }, [loading, openTurn, autoRedirect, router]);

  return children;
}
