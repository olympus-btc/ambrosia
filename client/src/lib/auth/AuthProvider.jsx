"use client";

import { createContext, useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";

import { authReducer, initialAuthState } from "@/lib/auth/authReducer";
import { authenticateUser, getCurrentSession, logoutSession } from "@/lib/auth/authSession";
import { subscribeAuthEvents } from "@/lib/auth/authEvents";
import { clearAuthLocalState } from "@/lib/auth/authLocalState";
import { useAuthRevalidation } from "@/lib/auth/useAuthRevalidation";
import { redirectToAuth, redirectToUnauthorized } from "@/lib/auth/authNavigator";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const isMountedRef = useRef(false);
  const isFetchingRef = useRef(false);

  const refreshSession = useCallback(async () => {
    if (isFetchingRef.current) return null;
    isFetchingRef.current = true;
    dispatch({ type: "INIT_START" });
    try {
      const session = await getCurrentSession();
      if (isMountedRef.current) {
        dispatch({ type: "INIT_SUCCESS", payload: session });
      }
      return session;
    } catch (error) {
      if (isMountedRef.current) {
        dispatch({ type: "INIT_ERROR", error });
      }
      return null;
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const login = useCallback(async ({ name, pin }) => {
    const session = await authenticateUser({ name, pin });
    dispatch({ type: "LOGIN_SUCCESS", payload: session });
    return session;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutSession();
    } finally {
      clearAuthLocalState();
      dispatch({ type: "LOGOUT" });
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refreshSession();
    return () => {
      isMountedRef.current = false;
    };
  }, [refreshSession]);

  useEffect(() => {
    const unsubscribe = subscribeAuthEvents({
      onExpired: () => {
        clearAuthLocalState();
        dispatch({ type: "EXPIRED" });
        redirectToAuth(router);
      },
      onForbidden: () => {
        dispatch({ type: "FORBIDDEN" });
        redirectToUnauthorized(router);
      },
    });

    return unsubscribe;
  }, [router]);

  useAuthRevalidation(state.isAuth, refreshSession);

  const value = useMemo(
    () => ({
      user: state.user,
      permissions: state.permissions,
      isAuth: state.isAuth,
      isLoading: state.isLoading,
      login,
      logout,
      refreshSession,
    }),
    [login, logout, refreshSession, state.isAuth, state.isLoading, state.permissions, state.user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
