"use client";

import { useCallback, useEffect, useState } from "react";

import { LOG_SOURCE_PHOENIXD } from "@/lib/logs";
import { getLogSources } from "@/services/logsService";

export function useLogSources() {
  const [logSources, setLogSources] = useState([]);
  const [logSourcesError, setLogSourcesError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getLogSources()
      .then((loadedLogSources) => {
        if (isMounted) setLogSources(loadedLogSources);
      })
      .catch((loadLogSourcesError) => {
        if (isMounted) setLogSourcesError(loadLogSourcesError);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const findLogSourceAvailability = useCallback(
    (logSourceId) => logSources.find((logSource) => logSource.id === logSourceId),
    [logSources],
  );

  const isLogSourceAvailable = useCallback((logSourceId) => {
    const logSourceAvailability = findLogSourceAvailability(logSourceId);
    if (logSourceAvailability) return logSourceAvailability.available;
    return logSourceId !== LOG_SOURCE_PHOENIXD;
  }, [findLogSourceAvailability]);

  return { logSources, logSourcesError, findLogSourceAvailability, isLogSourceAvailable };
}
