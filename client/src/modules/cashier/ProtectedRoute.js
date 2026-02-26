"use client";
import { useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useTurn } from "./useTurn";

const notProtectedRoutes = ["/", "/open-turn", "/close-turn"];

export function ProtectedRoute({ children }) {
  const { openTurn } = useTurn();
  const location = usePathname();
  const navigate = useRouter();

  useEffect(() => {
    if (!notProtectedRoutes.includes(location.pathname)) {
      if (!openTurn && userRole) {
        navigate("/open-turn", { replace: true });
      }
      if (!userRole) navigate("/", { replace: true });
    }
  }, [openTurn, location.pathname, navigate]);

  if (notProtectedRoutes.includes(location.pathname)) {
    return children;
  }

  if (!userRole || !openTurn) {
    return null;
  }

  return children;
}
