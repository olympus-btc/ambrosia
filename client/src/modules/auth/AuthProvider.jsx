"use client";
import { createContext, useEffect, useState } from "react";
import { loginFromService, logoutFromService } from "./authService";
import { apiClient } from "../../services/apiClient";
import { useRouter } from "next/navigation";
import { CART_STORAGE_KEY } from "../../components/pages/Store/Cart/hooks/usePersistentCart";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true)

  const router = useRouter();

  const clearCartStorage = () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing cart storage on logout", error);
    }
  };

  const fetchUser = async () => {
    try {
      setIsLoading(true)

      const data = await apiClient("/users/me", { silentAuth: true })

      setPermissions(data.perms);
      setUser(data.user);
      setIsAuth(true)
      console.log(data.user)
    } catch (error) {
      setUser(null)
      setPermissions(null)
      setIsAuth(false)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async ({ name, pin }) => {
    try {
      const loginResponse = await loginFromService(
        { name, pin }
      )

      setPermissions(loginResponse.perms);
      setUser(loginResponse.user);
      setIsAuth(true)

    } catch (error) {
      setIsAuth(false)
      throw error;
    }
  }
  const logout = async () => {
    await logoutFromService();
    clearCartStorage();
    setUser(null);
    setPermissions(null)
    setIsAuth(false);
    setIsLoading(false)
  };

  useEffect(() => {
    fetchUser();
    const handleExpired = () => {
      clearCartStorage();
      setUser(null)
      setPermissions(null)
      setIsAuth(false);
      setIsLoading(false)
      router.push("/auth")
    };
    const handleForbidden = () => {
      router.push("/unauthorized");
    };

    window.addEventListener("auth:expired", handleExpired);
    window.addEventListener("auth:forbidden", handleForbidden);
    return () => {
      window.removeEventListener("auth:expired", handleExpired);
      window.removeEventListener("auth:forbidden", handleForbidden);
    }
  }, []);

  useEffect(() => {
    if (!isAuth) return;

    const revalidate = () => {
      apiClient("/users/me", { silentAuth: false }).catch(() => { });
    };

    const onFocus = () => revalidate();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") revalidate();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuth]);

  const value = {
    user,
    permissions,
    isAuth,
    login,
    logout,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
