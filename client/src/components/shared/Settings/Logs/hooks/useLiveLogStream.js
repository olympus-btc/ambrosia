"use client";

import { useEffect, useRef, useState } from "react";

import { refreshAccessToken } from "@/lib/http/httpClient";
import {
  LOG_STREAM_EVENT_CONNECTED,
  LOG_STREAM_EVENT_ENTRY,
  LOG_STREAM_RECONNECT_DELAY_MILLISECONDS,
  LOGS_EVENT_SOURCE_ROUTE,
} from "@/lib/logs";

export function useLiveLogStream({ source, enabled = true, onLogEntry }) {
  const [liveLogStreamConnected, setLiveLogStreamConnected] = useState(false);
  const onLogEntryRef = useRef(onLogEntry);

  useEffect(() => {
    onLogEntryRef.current = onLogEntry;
  }, [onLogEntry]);

  useEffect(() => {
    if (!enabled || !source) return undefined;
    if (typeof window === "undefined" || typeof window.EventSource === "undefined") return undefined;

    let liveLogEventSource;
    let reconnectTimeoutId;
    let shouldReconnect = true;

    const connectToLiveLogStream = () => {
      liveLogEventSource = new EventSource(`${LOGS_EVENT_SOURCE_ROUTE}?source=${encodeURIComponent(source)}`);

      liveLogEventSource.onmessage = (liveLogMessageEvent) => {
        try {
          const logStreamEvent = JSON.parse(liveLogMessageEvent.data);
          if (logStreamEvent?.type === LOG_STREAM_EVENT_CONNECTED) {
            setLiveLogStreamConnected(true);
            return;
          }
          if (logStreamEvent?.type === LOG_STREAM_EVENT_ENTRY && logStreamEvent.entry) {
            onLogEntryRef.current?.(logStreamEvent.entry);
          }
        } catch {
          return;
        }
      };

      liveLogEventSource.onerror = () => {
        setLiveLogStreamConnected(false);
        liveLogEventSource.close();
        if (!shouldReconnect) return;
        reconnectTimeoutId = setTimeout(async () => {
          if (!shouldReconnect) return;
          try {
            await refreshAccessToken();
          } catch {}
          if (!shouldReconnect) return;
          connectToLiveLogStream();
        }, LOG_STREAM_RECONNECT_DELAY_MILLISECONDS);
      };
    };

    connectToLiveLogStream();

    return () => {
      shouldReconnect = false;
      clearTimeout(reconnectTimeoutId);
      setLiveLogStreamConnected(false);
      if (liveLogEventSource) liveLogEventSource.close();
    };
  }, [enabled, source]);

  return { liveLogStreamConnected };
}
