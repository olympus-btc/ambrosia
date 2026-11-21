"use client";

import { useCallback, useState } from "react";

import { exportLogsArchive } from "@/services/logsService";

export function useLogsArchiveDownload() {
  const [downloadingLogsArchive, setDownloadingLogsArchive] = useState(false);

  const downloadLogsArchive = useCallback(async () => {
    setDownloadingLogsArchive(true);
    try {
      await exportLogsArchive();
      return true;
    } catch {
      return false;
    } finally {
      setDownloadingLogsArchive(false);
    }
  }, []);

  return { downloadingLogsArchive, downloadLogsArchive };
}
