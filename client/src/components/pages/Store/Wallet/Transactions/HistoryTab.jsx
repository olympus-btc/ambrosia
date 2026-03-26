"use client";

import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { formatSats } from "../utils/formatters";

const getTransactionIcon = (type) => (
  type === "outgoing_payment" ? (
    <ArrowUpRight className="w-4 h-4 text-red-600" />
  ) : (
    <ArrowDownLeft className="w-4 h-4 text-green-600" />
  )
);

export function HistoryTab({ transactions, loading, filter, setFilter }) {
  const t = useTranslations("wallet");
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
          {t("payments.history.all")}
        </Button>
        <Button
          variant={filter === "incoming" ? "solid" : "bordered"}
          color="primary"
          size="sm"
          className={filter !== "incoming" ? "border border-border text-foreground hover:bg-muted" : ""}
          onPress={() => setFilter("incoming")}
        >
          {t("payments.history.received")}
        </Button>
        <Button
          variant={filter === "outgoing" ? "solid" : "bordered"}
          color="danger"
          size="sm"
          className={filter !== "outgoing" ? "border border-border text-foreground hover:bg-muted" : ""}
          onPress={() => setFilter("outgoing")}
        >
          {t("payments.history.sent")}
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
              {t("payments.history.noTx")}
            </h3>
            <p className="text-gray-500">{t("payments.history.noTxMessage")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx, i) => (
              <Card key={tx.paymentId || tx.txId || i} className="border" shadow="none">
                <CardBody className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        {getTransactionIcon(tx.type)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-deep">
                            {tx.type === "outgoing_payment"
                              ? t("payments.history.sent")
                              : t("payments.history.received")}
                          </span>
                          <span className={`text-lg font-bold ${tx.type === "outgoing_payment" ? "text-red-700" : "text-deep"}`}>
                            {formatSats(
                              tx.type === "outgoing_payment"
                                ? tx.sent
                                : tx.receivedSat,
                            )}{" "}
                            sats
                          </span>
                        </div>
                        <p className="text-sm text-deep">
                          {t("payments.history.fee")} {formatSats(Number(tx.fees) / 1000)} sats
                        </p>
                        {tx.description && (
                        <p className="text-sm text-deep">{tx.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {format.dateTime(new Date(tx.completedAt), { dateStyle: "short" })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format.dateTime(new Date(tx.completedAt), { timeStyle: "short" })}
                      </p>
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
