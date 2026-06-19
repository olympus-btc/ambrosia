"use client";

import { useCallback, useMemo, useState } from "react";

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
