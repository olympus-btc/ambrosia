"use client";
import { useAuth } from "@/hooks/auth/useAuth";

export function usePermission(requirement) {
  const { permissions } = useAuth();
  const names = new Set((permissions || []).map((p) => p.name));
  const list = Array.isArray(requirement) ? requirement : [requirement];
  return list.every((k) => names.has(k));
}

export function RequirePermission({ allOf = [], anyOf = [], children, fallback = null }) {
  const { permissions } = useAuth();
  const names = new Set((permissions || []).map((p) => p.name));

  const hasAll = allOf.length === 0 || allOf.every((k) => names.has(k));
  const hasAny = anyOf.length === 0 || anyOf.some((k) => names.has(k));

  return hasAll && hasAny ? children : fallback;
}
