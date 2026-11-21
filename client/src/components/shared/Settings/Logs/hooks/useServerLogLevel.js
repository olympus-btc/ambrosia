"use client";

import { useCallback, useEffect, useState } from "react";

import { isElectron } from "@/lib/isElectron";
import { getServerLogLevel, changeServerLogLevel } from "@/services/logsService";

export const SET_DESKTOP_LOG_LEVEL_IPC_CHANNEL = "logs:set-level";

async function applyLogLevelToDesktopApp(serverLogLevel) {
  if (!isElectron) return;
  try {
    await window.electron.ipc.invoke(SET_DESKTOP_LOG_LEVEL_IPC_CHANNEL, serverLogLevel);
  } catch {
    return;
  }
}

export function useServerLogLevel() {
  const [serverLogLevel, setServerLogLevel] = useState(null);
  const [updatingServerLogLevel, setUpdatingServerLogLevel] = useState(false);
  const [serverLogLevelError, setServerLogLevelError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getServerLogLevel()
      .then((loadedServerLogLevel) => {
        if (isMounted) setServerLogLevel(loadedServerLogLevel);
      })
      .catch((loadServerLogLevelError) => {
        if (isMounted) setServerLogLevelError(loadServerLogLevelError);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const updateServerLogLevel = useCallback(async (requestedServerLogLevel) => {
    setUpdatingServerLogLevel(true);
    setServerLogLevelError(null);
    try {
      const updatedServerLogLevel = await changeServerLogLevel(requestedServerLogLevel);
      setServerLogLevel(updatedServerLogLevel);
      await applyLogLevelToDesktopApp(updatedServerLogLevel);
      return true;
    } catch (updateServerLogLevelError) {
      setServerLogLevelError(updateServerLogLevelError);
      return false;
    } finally {
      setUpdatingServerLogLevel(false);
    }
  }, []);

  return { serverLogLevel, updatingServerLogLevel, serverLogLevelError, updateServerLogLevel };
}
