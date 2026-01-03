"use client";

import { Button, Card, CardBody, Chip, Spinner } from "@heroui/react";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatSats } from "./utils/formatters";

const getTransactionIcon = (type) => (
  type === "outgoing_payment" ? (
    <ArrowUpRight className="w-4 h-4 text-red-600" />
  ) : (
    <ArrowDownLeft className="w-4 h-4 text-green-600" />
  )
);

export function TransactionsHistoryTab({ transactions, loading, filter, setFilter }) {
  const t = useTranslations("wallet");

  return (
    <div className="p-6 space-y-6">
      <div className="flex space-x-2">
        <Button
          variant={filter === "all" ? "solid" : "outline"}
          color="primary"
          size="sm"
          onPress={() => setFilter("all")}
        >
          {t("payments.history.all")}
        </Button>
        <Button
          variant={filter === "incoming" ? "solid" : "outline"}
          color="success"
          size="sm"
          onPress={() => setFilter("incoming")}
        >
          {t("payments.history.received")}
        </Button>
        <Button
          variant={filter === "outgoing" ? "solid" : "outline"}
          color="danger"
          size="sm"
          onPress={() => setFilter("outgoing")}
        >
          {t("payments.history.sent")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12">
          <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-deep mb-2">
            {t("payments.history.noTx")}
          </h3>
          <p className="text-gray-500">{t("payments.history.noTxMessage")}</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.map((tx, i) => (
            <Card key={tx.paymentId || tx.txId || i} className="border">
              <CardBody className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-deep">
                          {tx.type === "outgoing_payment"
                            ? t("payments.history.sent")
                            : t("payments.history.received")}
                        </span>
                        <Chip
                          size="sm"
                          color={
                            tx.type === "outgoing_payment"
                              ? "danger"
                              : "success"
                          }
                          variant="flat"
                        >
                          {formatSats(
                            tx.type === "outgoing_payment"
                              ? tx.sent
                              : tx.receivedSat,
                          )}{" "}
                          sats
                        </Chip>
                      </div>
                      <p className="text-sm text-forest">
                        Fee: {formatSats(Number(tx.fees) / 1000)} sats
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(tx.completedAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.completedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
