export function subscribeAuthEvents({ onExpired, onForbidden, onWalletUnauthorized }) {
  if (typeof window === "undefined") return () => {};

  const handleExpired = () => {
    if (onExpired) onExpired();
  };

  const handleForbidden = () => {
    if (onForbidden) onForbidden();
  };

  const handleWalletUnauthorized = () => {
    if (onWalletUnauthorized) onWalletUnauthorized();
  };

  window.addEventListener("auth:expired", handleExpired);
  window.addEventListener("auth:forbidden", handleForbidden);
  window.addEventListener("wallet:unauthorized", handleWalletUnauthorized);

  return () => {
    window.removeEventListener("auth:expired", handleExpired);
    window.removeEventListener("auth:forbidden", handleForbidden);
    window.removeEventListener("wallet:unauthorized", handleWalletUnauthorized);
  };
}
