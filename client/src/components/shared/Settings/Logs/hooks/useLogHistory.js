"use client";

import { useCallback, useState } from "react";

import { getLogHistory } from "@/services/logsService";

export function useLogHistory() {
  const [loadingLogHistory, setLoadingLogHistory] = useState(false);
  const [logHistoryError, setLogHistoryError] = useState(null);

  const loadLogHistory = useCallback(async (logHistoryQuery) => {
    setLoadingLogHistory(true);
    setLogHistoryError(null);
    try {
      return await getLogHistory(logHistoryQuery);
    } catch (loadLogHistoryError) {
      setLogHistoryError(loadLogHistoryError);
      return [];
    } finally {
      setLoadingLogHistory(false);
    }
  }, []);

  return { loadingLogHistory, logHistoryError, loadLogHistory };
}
