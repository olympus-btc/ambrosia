"use client";

import { useState } from "react";

import { Card, CardBody, Tab, Tabs } from "@heroui/react";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import { useTranslations } from "next-intl";

import { TransactionsHistoryTab } from "./TransactionsHistoryTab";
import { TransactionsReceiveTab } from "./TransactionsReceiveTab";
import { TransactionsSendTab } from "./TransactionsSendTab";

export function Transactions({
  transactions,
  loading,
  setLoading,
  setError,
  filter,
  setFilter,
  invoiceActions,
}) {
  const t = useTranslations("wallet");
  const [activeTab, setActiveTab] = useState("receive");

  return (
    <Card className="rounded-lg mb-6 p-6">
      <CardBody className="p-0">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={setActiveTab}
          variant="underlined"
          classNames={{
            tabList: "gap-6 relative rounded-none px-6 py-0",
            cursor: "w-full bg-forest",
            tab: "max-w-fit px-6 py-4 h-12",
            tabContent: "group-data-[selected=true]:text-forest",
          }}
        >
          <Tab
            key="receive"
            title={(
              <div className="flex items-center space-x-2">
                <ArrowDownLeft className="w-4 h-4" />
                <span>{t("payments.receive.tabTitle")}</span>
              </div>
            )}
          >
            <TransactionsReceiveTab
              loading={loading}
              setLoading={setLoading}
              setError={setError}
              invoiceActions={invoiceActions}
            />
          </Tab>

          <Tab
            key="send"
            title={(
              <div className="flex items-center space-x-2">
                <ArrowUpRight className="w-4 h-4" />
                <span>{t("payments.send.tabTitle")}</span>
              </div>
            )}
          >
            <TransactionsSendTab
              loading={loading}
              setLoading={setLoading}
              setError={setError}
            />
          </Tab>

          <Tab
            key="history"
            title={(
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4" />
                <span>{t("payments.history.tabTitle")}</span>
              </div>
            )}
          >
            <TransactionsHistoryTab
              transactions={transactions}
              loading={loading}
              filter={filter}
              setFilter={setFilter}
            />
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  );
}
