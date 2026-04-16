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

    let es;
    let shouldReconnect = true;

    const connect = () => {
      es = new EventSource("/api/ws-payments");

      es.onopen = () => {
        setConnected(true);
      };

      es.onmessage = (event) => {
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
          console.warn("SSE payments mensaje no procesado", err);
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
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
      if (es) es.close();
    };
  }, []);

  return { connected, setInvoiceHash, setFetchers, onPayment };
}
