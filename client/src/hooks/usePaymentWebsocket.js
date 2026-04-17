"use client";
import { useEffect, useRef, useState, useCallback } from "react";

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

    let eventSource;
    let shouldReconnect = true;

    const connect = () => {
      eventSource = new EventSource("/api/ws-payments");

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onmessage = (event) => {
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
              const customEvent = new CustomEvent("wallet:invoicePaid", {
                detail: { paymentHash: data.paymentHash },
              });
              window.dispatchEvent(customEvent);
            }
          }
        } catch (err) {
          console.warn("SSE payments mensaje no procesado", err);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        eventSource.close();
        if (shouldReconnect) {
          setTimeout(async () => {
            try {
              await fetch("/api/auth/refresh", { method: "POST" });
            } catch {}
            connect();
          }, 3000);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (eventSource) eventSource.close();
    };
  }, []);

  return { connected, setInvoiceHash, setFetchers, onPayment };
}
