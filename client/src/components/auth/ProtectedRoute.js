"use client";
import { useContext, useEffect } from "react";

import { useRouter } from "next/navigation";

import { AuthContext } from "../../modules/auth/AuthProvider";

export function ProtectedRoute({ children, requiredRoles = [] }) {
  const { isAuthenticated, isLoading, user } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && requiredRoles.length > 0) {
      const userRoles = user?.roles || [];
      const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role),
      );

      if (!hasRequiredRole) {
        router.push("/unauthorized");
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRoles, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // El useEffect ya redirige
  }

  if (requiredRoles.length > 0) {
    const userRoles = user?.roles || [];
    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role),
    );

    if (!hasRequiredRole) {
      return null; // El useEffect ya redirige
    }
  }

  return children;
}

export function withAuth(Component, requiredRoles = []) {
  return function AuthenticatedComponent(props) {
    return (
      <ProtectedRoute requiredRoles={requiredRoles}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
