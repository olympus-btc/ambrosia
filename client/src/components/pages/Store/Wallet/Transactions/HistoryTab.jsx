"use client";

import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { AmountDisplay } from "@/components/shared/AmountDisplay";

import { formatSats } from "../utils/formatters";

const getTransactionIcon = (transactionType) => (
  transactionType === "outgoing_payment" ? (
    <ArrowUpRight className="w-4 h-4 text-red-600" />
  ) : (
    <ArrowDownLeft className="w-4 h-4 text-green-600" />
  )
);

export function HistoryTab({ transactions, loading, filter, setFilter, currentRate }) {
  const walletTranslations = useTranslations("wallet");
  const format = useFormatter();

  return (
    <div className="p-6 space-y-6">
      <div className="flex space-x-2">
        <Button
          variant={filter === "all" ? "solid" : "bordered"}
          color="default"
          size="sm"
          className={filter !== "all" ? "border border-border text-foreground hover:bg-muted" : ""}
          onPress={() => setFilter("all")}
        >
          {walletTranslations("payments.history.all")}
        </Button>
        <Button
          variant={filter === "incoming" ? "solid" : "bordered"}
          color="primary"
          size="sm"
          className={filter !== "incoming" ? "border border-border text-foreground hover:bg-muted" : ""}
          onPress={() => setFilter("incoming")}
        >
          {walletTranslations("payments.history.received")}
        </Button>
        <Button
          variant={filter === "outgoing" ? "solid" : "bordered"}
          color="danger"
          size="sm"
          className={filter !== "outgoing" ? "border border-border text-foreground hover:bg-muted" : ""}
          onPress={() => setFilter("outgoing")}
        >
          {walletTranslations("payments.history.sent")}
        </Button>
      </div>

      <div className="h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner size="lg" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <History className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-deep mb-2">
              {walletTranslations("payments.history.noTx")}
            </h3>
            <p className="text-gray-500">{walletTranslations("payments.history.noTxMessage")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction, index) => (
              <Card key={transaction.paymentId || transaction.txId || index} className="border" shadow="none">
                <CardBody className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex w-10 h-10 shrink-0 bg-gray-100 rounded-full items-center justify-center">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-deep">
                          {transaction.type === "outgoing_payment"
                            ? walletTranslations("payments.history.sent")
                            : walletTranslations("payments.history.received")}
                        </span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {transaction.completedAt
                            ? `${format.dateTime(new Date(transaction.completedAt), { dateStyle: "short" })} ${format.dateTime(new Date(transaction.completedAt), { timeStyle: "short" })}`
                            : "—"}
                        </span>
                      </div>
                      <div className={`text-lg font-bold ${transaction.type === "outgoing_payment" ? "text-red-700" : "text-deep"}`}>
                        {transaction.exchangeRateAtPayment ? (
                          <AmountDisplay
                            satoshis={transaction.type === "outgoing_payment" ? transaction.sent : transaction.receivedSat}
                            exchangeRateAtSale={transaction.exchangeRateAtPayment}
                            exchangeRateCurrency={transaction.exchangeRateCurrency}
                            fiatAmountAtPayment={transaction.fiatAmountAtPayment}
                            currentRate={currentRate}
                          />
                        ) : (
                          <>
                            {formatSats(transaction.type === "outgoing_payment" ? transaction.sent : transaction.receivedSat)}
                            {" "}sats
                          </>
                        )}
                      </div>
                      <p className="text-sm text-deep">
                        {walletTranslations("payments.history.fee")} {formatSats(Number(transaction.fees) / 1000)} sats
                      </p>
                      {transaction.description && (
                        <p className="text-sm text-deep">{transaction.description}</p>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
