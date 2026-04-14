"use client";

import { createContext, useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { useRouter } from "next/navigation";

import { CART_STORAGE_KEY } from "@/components/pages/Store/Cart/hooks/usePersistentCart";
import { useAuthRevalidation } from "@/hooks/auth/useAuthRevalidation";
import { subscribeAuthEvents } from "@/lib/auth/authEvents";
import { clearAuthLocalState } from "@/lib/auth/authLocalState";
import { authenticateUser, getCurrentSession, logoutSession } from "@/lib/auth/authSession";
import { authReducer, initialAuthState } from "@/reducers/auth/authReducer";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const isMountedRef = useRef(false);
  const isFetchingRef = useRef(false);

  const refreshSession = useCallback(async ({ silent = false } = {}) => {
    if (isFetchingRef.current) return null;
    isFetchingRef.current = true;
    if (!silent) {
      dispatch({ type: "INIT_START" });
    }
    try {
      const session = await getCurrentSession();
      if (isMountedRef.current) {
        dispatch({ type: "INIT_SUCCESS", payload: session });
      }
      return session;
    } catch (error) {
      if (isMountedRef.current) {
        dispatch({ type: "INIT_ERROR", payload: error });
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
      clearAuthLocalState(() => {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      });
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
        clearAuthLocalState(() => {
          window.localStorage.removeItem(CART_STORAGE_KEY);
        });
        dispatch({ type: "EXPIRED" });
        router.push("/auth");
      },
      onForbidden: () => {
        dispatch({ type: "FORBIDDEN" });
        router.push("/unauthorized");
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
