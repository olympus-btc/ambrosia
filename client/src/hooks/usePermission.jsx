"use client";
import { useMemo } from "react";

import { useAuth } from "@/hooks/auth/useAuth";
import { buildPermissionSet } from "@/lib/modules";

function usePermissionNames() {
  const { permissions } = useAuth();
  return useMemo(() => buildPermissionSet(permissions), [permissions]);
}

export function usePermission({ allOf = [], anyOf = [] } = {}) {
  const names = usePermissionNames();
  const hasAll = allOf.length === 0 || allOf.every((k) => names.has(k));
  const hasAny = anyOf.length === 0 || anyOf.some((k) => names.has(k));
  return hasAll && hasAny;
}

export function RequirePermission({ allOf = [], anyOf = [], children, fallback = null }) {
  const allowed = usePermission({ allOf, anyOf });
  return allowed ? <>{children}</> : fallback;
}
