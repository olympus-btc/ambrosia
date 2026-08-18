"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  addToast,
  Card,
  CardBody,
  Spinner,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { useBitcoinPrice } from "@/components/hooks/useBitcoinPrice";
import { useCurrency } from "@/components/hooks/useCurrency";
import {
  getBalance,
  getIncomingTransactions,
  getInfo,
  getOutgoingTransactions,
} from "@/services/walletService";
import { usePaymentWebsocket } from "@hooks/usePaymentWebsocket";

import { useInvoiceState } from "./hooks/useInvoiceState";
import { NodeError, NodeInfo } from "./NodeInfo";
import { InvoiceModal, Transactions } from "./Transactions";
import { WalletPasswordCard } from "./WalletPassword";

export function StoreWallet() {
  const walletTranslations = useTranslations("wallet");
  const { currency } = useCurrency();
  const { currentRate } = useBitcoinPrice({ currencyAcronym: currency.acronym });
  const [info, setInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const fetchTransactionsRef = useRef(null);
  const invoiceHashRef = useRef(null);
  const { connected: wsConnected, setInvoiceHash, setFetchers, onPayment } = usePaymentWebsocket();
  const { invoiceState, actions: invoiceActions } = useInvoiceState();

  const fetchInfo = useCallback(async () => {
    try {
      setInfoLoading(true);
      const [infoResponse, balanceResponse] = await Promise.all([getInfo(), getBalance()]);
      setInfo(infoResponse);
      setBalance(balanceResponse);
      setError("");
    } catch (walletInfoError) {
      console.error(walletInfoError);
      setError(walletTranslations("nodeInfo.fetchInfoError"));
      addToast({
        title: walletTranslations("errorTitle"),
        description: walletTranslations("nodeInfo.getInfoErrorDescription"),
        variant: "solid",
        color: "danger",
      });
    } finally {
      setInfoLoading(false);
    }
  }, [walletTranslations]);

  const fetchTransactions = useCallback(
    async () => {
      try {
        setLoading(true);
        setTransactions([]);

        const [incoming, outgoing] = await Promise.all([
          filter === "incoming" || filter === "all" ? getIncomingTransactions() : [],
          filter === "outgoing" || filter === "all" ? getOutgoingTransactions() : [],
        ]);

        const sortedTransactions = [...incoming, ...outgoing].sort(
          (firstTransaction, secondTransaction) => (
            secondTransaction.completedAt - firstTransaction.completedAt
          ),
        );
        setTransactions(sortedTransactions);
      } catch {
        addToast({
          title: walletTranslations("errorTitle"),
          description: walletTranslations("payments.history.getTransactionsErrorDescription"),
          variant: "solid",
          color: "danger",
        });
      } finally {
        setLoading(false);
      }
    }, [filter, walletTranslations]);

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
    const unsubscribePaymentListener = onPayment((paymentEvent) => {
      if (
        invoiceHashRef.current &&
        paymentEvent.paymentHash &&
        paymentEvent.paymentHash === invoiceHashRef.current
      ) {
        invoiceActions.markAsPaid(Date.now());
      }
    });
    return () => unsubscribePaymentListener?.();
  }, [onPayment, invoiceActions]);

  if (infoLoading) {
    return (
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
        <CardBody className="flex flex-col items-center justify-center py-12">
          <Spinner size="lg" color="success" />
          <p className="text-lg font-semibold text-deep mt-4">
            {walletTranslations("loadingMessage")}
          </p>
        </CardBody>
      </Card>
    );
  }

  const nodeAvailable = Boolean(info?.nodeId);

  return (
    <div className="">
      {(error || !nodeAvailable) && (
        <NodeError error={error || walletTranslations("nodeInfo.nodeUnavailable")} />
      )}

      {nodeAvailable && (
        <>
          <div className="lg:grid lg:grid-cols-2 lg:gap-6">
            <NodeInfo
              info={info}
              balance={balance}
              onRefresh={fetchInfo}
              currentRate={currentRate}
              currencyAcronym={currency.acronym}
              locale={currency.locale}
            />

            <Transactions
              transactions={transactions}
              loading={loading}
              filter={filter}
              setFilter={setFilter}
              invoiceActions={invoiceActions}
              fetchInfo={fetchInfo}
              fetchTransactions={fetchTransactions}
              currentRate={currentRate}
            />
          </div>

          <WalletPasswordCard />

          <InvoiceModal
            invoiceState={invoiceState}
            onClose={invoiceActions.closeModal}
            onMarkAsPaid={() => invoiceActions.markAsPaid(Date.now())}
            wsConnected={wsConnected}
          />
        </>
      )}

    </div>
  );
}
