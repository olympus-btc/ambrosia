import { useEffect } from "react";

export function useAuthRevalidation(isAuth, revalidate) {
  useEffect(() => {
    if (!isAuth) return;
    if (typeof window === "undefined") return;

    const onFocus = () => revalidate({ silent: true });
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") revalidate({ silent: true });
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuth, revalidate]);
}
