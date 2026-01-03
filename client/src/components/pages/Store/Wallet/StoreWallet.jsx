"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  addToast,
  Card,
  CardBody,
  Spinner,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import WalletGuard from "@components/auth/WalletGuard";
import { usePaymentWebsocket } from "@hooks/usePaymentWebsocket";
import {
  getIncomingTransactions,
  getInfo,
  getOutgoingTransactions,
} from "@modules/cashier/cashierService";

import { useInvoiceState } from "./hooks/useInvoiceState";
import { InvoiceModal } from "./InvoiceModal";
import { NodeError } from "./NodeError";
import { NodeInfo } from "./NodeInfo";
import { Transactions } from "./Transactions";

function WalletInner() {
  const t = useTranslations("wallet");
  const [info, setInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const fetchTransactionsRef = useRef(null);
  const invoiceHashRef = useRef(null);
  const { setInvoiceHash, setFetchers, onPayment } = usePaymentWebsocket();
  const { invoiceState, actions: invoiceActions } = useInvoiceState();

  const fetchInfo = useCallback(async () => {
    try {
      const res = await getInfo();
      setInfo(res);
      setError("");
    } catch (err) {
      console.error(err);
      setError(t("nodeInfo.fetchInfoError"));
      addToast({
        title: "Error",
        description: t("nodeInfo.getInfoErrorDescription"),
        variant: "solid",
        color: "danger",
      });
    }
  }, [t]);

  const fetchTransactions = useCallback(
    async () => {
      try {
        setLoading(true);
        let incoming = [];
        let outgoing = [];

        if (filter === "incoming" || filter === "all") {
          incoming = await getIncomingTransactions();
        }
        if (filter === "outgoing" || filter === "all") {
          outgoing = await getOutgoingTransactions();
        }

        const allTx = [...incoming, ...outgoing].sort(
          (a, b) => b.completedAt - a.completedAt,
        );
        setTransactions(allTx);
      } catch {
        setError(t("history.getTransactionsError"));
        addToast({
          title: "Error",
          description: t("history.getTransactionsErrorDescription"),
          variant: "solid",
          color: "danger",
        });
      } finally {
        setLoading(false);
      }
    }, [filter, t]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchTransactionsRef.current = fetchTransactions;
    setFetchers(fetchInfo, fetchTransactions);
  }, [fetchTransactions, fetchInfo, setFetchers]);

  useEffect(() => {
    invoiceHashRef.current = invoiceState.created?.paymentHash || null;
    setInvoiceHash(invoiceState.created?.paymentHash || null);
  }, [invoiceState.created, setInvoiceHash]);

  useEffect(() => {
    const off = onPayment((data) => {
      if (
        invoiceHashRef.current &&
        data.paymentHash &&
        data.paymentHash === invoiceHashRef.current
      ) {
        invoiceActions.markAsPaid(Date.now());
      }
    });
    return () => off?.();
  }, [onPayment, invoiceActions]);

  if (!info) {
    return (
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
        <CardBody className="flex flex-col items-center justify-center py-12">
          <Spinner size="lg" color="success" />
          <p className="text-lg font-semibold text-deep mt-4">
            {t("loadingMessage")}
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="">
      {error && (
        <NodeError error={error} />
      )}

      <NodeInfo info={info} />

      <Transactions
        transactions={transactions}
        loading={loading}
        setLoading={setLoading}
        error={error}
        setError={setError}
        filter={filter}
        setFilter={setFilter}
        invoiceActions={invoiceActions}
      />

      <InvoiceModal
        invoiceState={invoiceState}
        onClose={invoiceActions.closeModal}
      />

    </div>
  );
}

export function StoreWallet() {
  const t = useTranslations("wallet");
  return (
    <WalletGuard
      placeholder={<div className="min-h-screen gradient-fresh p-4" />}
      title={t("access.title")}
      passwordLabel={t("access.passwordLabel")}
      confirmText={t("access.confirmText")}
      cancelText={t("access.cancelText")}
    >
      <WalletInner />
    </WalletGuard>
  );
}
