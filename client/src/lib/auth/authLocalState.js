import { CART_STORAGE_KEY } from "@/components/pages/Store/Cart/hooks/usePersistentCart";

export function clearAuthLocalState() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing storage on logout", error);
  }
}
