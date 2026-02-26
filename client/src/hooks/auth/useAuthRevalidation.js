import { useEffect } from "react";

export function useAuthRevalidation(isAuth, revalidate) {
  useEffect(() => {
    if (!isAuth) return;
    if (typeof window === "undefined") return;

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
  }, [isAuth, revalidate]);
}
