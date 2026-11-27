"use client";

import { useCallback, useEffect, useState } from "react";

import { isElectron } from "@/lib/isElectron";
import { getLogSettings, updateLogSettings } from "@/services/logsService";

export const SET_DESKTOP_LOG_LEVEL_IPC_CHANNEL = "logs:set-level";

async function applyLogLevelToDesktopApp(serverLogLevel) {
  if (!isElectron) return;
  try {
    await window.electron.ipc.invoke(SET_DESKTOP_LOG_LEVEL_IPC_CHANNEL, serverLogLevel);
  } catch {
    return;
  }
}

export function useLogSettings() {
  const [logSettings, setLogSettings] = useState(null);
  const [savingLogSettings, setSavingLogSettings] = useState(false);
  const [logSettingsError, setLogSettingsError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getLogSettings()
      .then((loadedLogSettings) => {
        if (isMounted) setLogSettings(loadedLogSettings);
      })
      .catch((loadLogSettingsError) => {
        if (isMounted) setLogSettingsError(loadLogSettingsError);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const saveLogSettings = useCallback(async (requestedLogSettings) => {
    setSavingLogSettings(true);
    setLogSettingsError(null);
    try {
      const savedLogSettings = await updateLogSettings(requestedLogSettings);
      setLogSettings(savedLogSettings);
      await applyLogLevelToDesktopApp(savedLogSettings.level);
      return true;
    } catch (saveLogSettingsError) {
      setLogSettingsError(saveLogSettingsError);
      return false;
    } finally {
      setSavingLogSettings(false);
    }
  }, []);

  return { logSettings, savingLogSettings, logSettingsError, saveLogSettings };
}
