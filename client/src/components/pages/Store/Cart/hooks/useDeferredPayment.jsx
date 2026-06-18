"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Manages the state for a single deferred payment kind (BTC/cash/card): its
 * pending config, the "complete payment" handler (built by the kind-specific
 * `buildComplete` from paymentHandlers.js) and the callback that clears the
 * config when its modal closes.
 */
export function useDeferredPayment(buildComplete, handlerContext) {
  const [config, setConfig] = useState(null);

  const handleComplete = useMemo(
    () => buildComplete({
      getConfig: () => config,
      setConfig,
      ...handlerContext,
    }),
    [buildComplete, config, handlerContext],
  );

  const clearConfig = useCallback(() => setConfig(null), []);

  return { config, setConfig, handleComplete, clearConfig };
}
