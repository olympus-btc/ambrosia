"use client";

import { useCallback, useRef, useState } from "react";

import { isElectron } from "@lib/isElectron";

const DEBOUNCE_MS = 500;

export function useAutoLiquidity() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimer = useRef(null);

  const loadAutoLiquidity = useCallback(async () => {
    if (!isElectron) {
      return true;
    }

    setLoading(true);
    setError(null);
    try {
      const autoLiquidityConfig = await window.electron.ipc.invoke("phoenixd:get-auto-liquidity");
      if (autoLiquidityConfig?.nwcConfigured) {
        return "nwc";
      }
      setEnabled(autoLiquidityConfig !== "off");
      return true;
    } catch (loadError) {
      setError(loadError.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleAutoLiquidity = useCallback(async (newEnabled) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    setEnabled(newEnabled);
    setRestarting(true);
    setError(null);

    await new Promise((resolve) => {
      debounceTimer.current = setTimeout(resolve, DEBOUNCE_MS);
    });

    try {
      const requestedAutoLiquidityValue = newEnabled ? "2m" : "off";
      const setAutoLiquidityResult = await window.electron.ipc.invoke(
        "phoenixd:set-auto-liquidity",
        requestedAutoLiquidityValue,
      );
      if (setAutoLiquidityResult?.nwcConfigured) {
        setEnabled(!newEnabled);
        return "nwc";
      }
      if (setAutoLiquidityResult?.requiresManualRestart) {
        return "manual";
      }
      return true;
    } catch (toggleError) {
      setEnabled(!newEnabled);
      setError(toggleError.message);
      return false;
    } finally {
      setRestarting(false);
    }
  }, []);

  return { enabled, loading, restarting, error, loadAutoLiquidity, toggleAutoLiquidity };
}
