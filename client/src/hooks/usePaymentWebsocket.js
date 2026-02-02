"use client";
import { useEffect, useRef, useState, useCallback } from "react";

import { getWsUrl } from "@/config/api";

export function usePaymentWebsocket() {
  const [connected, setConnected] = useState(false);
  const invoiceHashRef = useRef(null);
  const fetchTransactionsRef = useRef(null);
  const fetchInfoRef = useRef(null);
  const paymentListenersRef = useRef(new Set());

  const setInvoiceHash = useCallback((hash) => {
    invoiceHashRef.current = hash || null;
  }, []);

  const setFetchers = useCallback((fetchInfo, fetchTransactions) => {
    fetchInfoRef.current = fetchInfo;
    fetchTransactionsRef.current = fetchTransactions;
  }, []);

  const onPayment = useCallback((listener) => {
    paymentListenersRef.current.add(listener);
    return () => paymentListenersRef.current.delete(listener);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let ws;
    let shouldReconnect = true;

    const connect = () => {
      const url = getWsUrl();
      ws = new WebSocket(url);

      ws.onopen = () => {
        setConnected(true);
        console.info("WS payments conectado", url);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === "payment_received") {
            fetchTransactionsRef.current?.();
            fetchInfoRef.current?.();

            paymentListenersRef.current.forEach((listener) => listener(data));

            if (
              invoiceHashRef.current &&
              data.paymentHash &&
              data.paymentHash === invoiceHashRef.current
            ) {
              const evt = new CustomEvent("wallet:invoicePaid", {
                detail: { paymentHash: data.paymentHash },
              });
              window.dispatchEvent(evt);
            }
          }
        } catch (err) {
          console.warn("WS payments mensaje no procesado", err);
        }
      };

      ws.onerror = (err) => {
        console.warn("WS payments error", err);
      };

      ws.onclose = () => {
        setConnected(false);
        if (shouldReconnect) {
          setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  return { connected, setInvoiceHash, setFetchers, onPayment };
}
