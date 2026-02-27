export function subscribeAuthEvents({ onExpired, onForbidden }) {
  if (typeof window === "undefined") return () => {};

  const handleExpired = () => {
    if (onExpired) onExpired();
  };

  const handleForbidden = () => {
    if (onForbidden) onForbidden();
  };

  window.addEventListener("auth:expired", handleExpired);
  window.addEventListener("auth:forbidden", handleForbidden);

  return () => {
    window.removeEventListener("auth:expired", handleExpired);
    window.removeEventListener("auth:forbidden", handleForbidden);
  };
}
