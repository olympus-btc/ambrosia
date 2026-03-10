"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isElectron } from "@lib/isElectron";

const DEBOUNCE_MS = 500;

export function useAutoLiquidity() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (!isElectron) {
      setLoading(false);
      return;
    }
    window.electron.ipc
      .invoke("phoenixd:get-auto-liquidity")
      .then((value) => {
        setEnabled(value !== "off");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggle = useCallback(async (newEnabled) => {
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
      const value = newEnabled ? "2m" : "off";
      const result = await window.electron.ipc.invoke("phoenixd:set-auto-liquidity", value);
      if (result?.requiresManualRestart) {
        return "manual";
      }
      return true;
    } catch (err) {
      setEnabled(!newEnabled);
      setError(err.message);
      return false;
    } finally {
      setRestarting(false);
    }
  }, []);

  return { enabled, loading, restarting, error, toggle };
}
