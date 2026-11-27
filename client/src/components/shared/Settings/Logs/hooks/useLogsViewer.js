"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { buildLogEntryIdentity, keepLatestLogEntries, LOG_SOURCE_SERVER, logEntryMatchesFilters } from "@/lib/logs";

import { useDebouncedSearchText } from "./useDebouncedSearchText";
import { useLiveLogStream } from "./useLiveLogStream";
import { useLogHistory } from "./useLogHistory";
import { useLogSources } from "./useLogSources";

export const ALL_LOG_LEVELS_FILTER_KEY = "ALL";

export function useLogsViewer() {
  const { findLogSourceAvailability, isLogSourceAvailable } = useLogSources();
  const { loadingLogHistory, loadLogHistory } = useLogHistory();
  const [selectedLogSource, setSelectedLogSource] = useState(LOG_SOURCE_SERVER);
  const [minimumLogLevelFilter, setMinimumLogLevelFilter] = useState(ALL_LOG_LEVELS_FILTER_KEY);
  const [searchText, setSearchText] = useState("");
  const [isLiveStreamEnabled, setIsLiveStreamEnabled] = useState(true);
  const [visibleLogEntries, setVisibleLogEntries] = useState([]);
  const [logHistoryReloadCount, setLogHistoryReloadCount] = useState(0);
  const isLogHistoryLoadInProgressRef = useRef(false);
  const liveLogEntriesDuringHistoryLoadRef = useRef([]);
  const nextViewerEntryKeyRef = useRef(0);
  const debouncedSearchText = useDebouncedSearchText(searchText);
  const minimumLogLevel = minimumLogLevelFilter === ALL_LOG_LEVELS_FILTER_KEY ? null : minimumLogLevelFilter;
  const isSelectedLogSourceAvailable = isLogSourceAvailable(selectedLogSource);

  const assignViewerEntryKey = useCallback((logEntry) => {
    nextViewerEntryKeyRef.current += 1;
    return { ...logEntry, viewerEntryKey: nextViewerEntryKeyRef.current };
  }, []);

  useEffect(() => {
    if (!isSelectedLogSourceAvailable) return undefined;
    let isLatestLogHistoryRequest = true;
    isLogHistoryLoadInProgressRef.current = true;
    liveLogEntriesDuringHistoryLoadRef.current = [];
    loadLogHistory({ source: selectedLogSource, minimumLevel: minimumLogLevel, searchText: debouncedSearchText })
      .then((logHistoryEntries) => {
        if (!isLatestLogHistoryRequest) return;
        isLogHistoryLoadInProgressRef.current = false;
        const logHistoryIdentities = new Set(logHistoryEntries.map(buildLogEntryIdentity));
        const liveLogEntriesMissingFromHistory = liveLogEntriesDuringHistoryLoadRef.current.filter(
          (liveLogEntry) => !logHistoryIdentities.has(buildLogEntryIdentity(liveLogEntry)),
        );
        setVisibleLogEntries(
          keepLatestLogEntries([...logHistoryEntries.map(assignViewerEntryKey), ...liveLogEntriesMissingFromHistory]),
        );
      });
    return () => {
      isLatestLogHistoryRequest = false;
    };
  }, [
    selectedLogSource,
    minimumLogLevel,
    debouncedSearchText,
    isSelectedLogSourceAvailable,
    loadLogHistory,
    logHistoryReloadCount,
    assignViewerEntryKey,
  ]);

  const appendLiveLogEntry = useCallback((liveLogEntry) => {
    if (!logEntryMatchesFilters(liveLogEntry, { minimumLevel: minimumLogLevel, searchText: debouncedSearchText })) return;
    const keyedLiveLogEntry = assignViewerEntryKey(liveLogEntry);
    if (isLogHistoryLoadInProgressRef.current) {
      liveLogEntriesDuringHistoryLoadRef.current = keepLatestLogEntries([
        ...liveLogEntriesDuringHistoryLoadRef.current,
        keyedLiveLogEntry,
      ]);
    }
    setVisibleLogEntries((previousLogEntries) => keepLatestLogEntries([...previousLogEntries, keyedLiveLogEntry]));
  }, [minimumLogLevel, debouncedSearchText, assignViewerEntryKey]);

  const { liveLogStreamConnected } = useLiveLogStream({
    source: selectedLogSource,
    enabled: isLiveStreamEnabled && isSelectedLogSourceAvailable,
    onLogEntry: appendLiveLogEntry,
  });

  const selectLogSource = useCallback((logSourceId) => {
    setVisibleLogEntries([]);
    setSelectedLogSource(logSourceId);
  }, []);

  const changeLiveStreamEnabled = useCallback((nextIsLiveStreamEnabled) => {
    setIsLiveStreamEnabled(nextIsLiveStreamEnabled);
    if (nextIsLiveStreamEnabled) setLogHistoryReloadCount((previousReloadCount) => previousReloadCount + 1);
  }, []);

  const clearVisibleLogEntries = useCallback(() => setVisibleLogEntries([]), []);

  return {
    selectedLogSource,
    selectedLogSourceAvailability: findLogSourceAvailability(selectedLogSource),
    isSelectedLogSourceAvailable,
    selectLogSource,
    minimumLogLevelFilter,
    setMinimumLogLevelFilter,
    searchText,
    setSearchText,
    isLiveStreamEnabled,
    changeLiveStreamEnabled,
    liveLogStreamConnected,
    visibleLogEntries,
    clearVisibleLogEntries,
    loadingLogHistory,
  };
}
