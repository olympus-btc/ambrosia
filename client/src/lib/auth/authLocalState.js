export function clearAuthLocalState(onClear) {
  if (typeof window === "undefined") return;
  try {
    onClear?.();
  } catch (error) {
    console.error("Error clearing storage on logout", error);
  }
}
