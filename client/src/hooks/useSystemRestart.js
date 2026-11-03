"use client";

import { useCallback, useState } from "react";

import {
  getRestartCapabilities,
  restartPhoenixd as requestPhoenixdRestart,
  restartServer as requestServerRestart,
} from "@/services/systemService";
import { isElectron } from "@lib/isElectron";

export function useSystemRestart() {
  const [serverRestartSupported, setServerRestartSupported] = useState(isElectron);
  const [phoenixdRestartSupported, setPhoenixdRestartSupported] = useState(isElectron);
  const [loadingCapabilities, setLoadingCapabilities] = useState(false);
  const [restartingTarget, setRestartingTarget] = useState(null);
  const [error, setError] = useState(null);

  const loadRestartCapabilities = useCallback(async () => {
    if (isElectron) {
      return;
    }

    setLoadingCapabilities(true);
    setError(null);
    try {
      const capabilities = await getRestartCapabilities();
      setServerRestartSupported(Boolean(capabilities?.serverRestartSupported));
      setPhoenixdRestartSupported(Boolean(capabilities?.phoenixdRestartSupported));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoadingCapabilities(false);
    }
  }, []);

  const restartService = useCallback(async (serviceName, requestRestart) => {
    setRestartingTarget(serviceName);
    setError(null);
    try {
      if (isElectron) {
        await window.electron.ipc.invoke("services:restart", serviceName);
      } else {
        await requestRestart();
      }
      return true;
    } catch (restartError) {
      setError(restartError.message);
      return false;
    } finally {
      setRestartingTarget(null);
    }
  }, []);

  const restartServer = useCallback(
    () => restartService("backend", requestServerRestart),
    [restartService],
  );

  const restartPhoenixd = useCallback(
    () => restartService("phoenixd", requestPhoenixdRestart),
    [restartService],
  );

  return {
    serverRestartSupported,
    phoenixdRestartSupported,
    loadingCapabilities,
    restartingTarget,
    error,
    loadRestartCapabilities,
    restartServer,
    restartPhoenixd,
  };
}
