"use client";

import { useState } from "react";

import { Card, CardBody, Tab, Tabs } from "@heroui/react";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTour } from "@/hooks/tour/useTour";

const WALLET_RECEIVE_TOUR_KEY = "ambrosia:tour:wallet-receive";

import { HistoryTab } from "./HistoryTab";
import { ReceiveTab } from "./ReceiveTab";
import { SendTab } from "./SendTab";

export function Transactions({
  transactions,
  loading,
  filter,
  setFilter,
  invoiceActions,
  fetchInfo,
  fetchTransactions,
}) {
  const t = useTranslations("wallet");
  const tTour = useTranslations("walletTour");
  const [activeTab, setActiveTab] = useState("receive");

  useTour({
    key: WALLET_RECEIVE_TOUR_KEY,
    delay: 500,
    driverOptions: {
      allowClose: true,
      overlayOpacity: 0.5,
      showProgress: true,
      steps: [
        {
          element: "#wallet-receive-amount",
          popover: {
            title: tTour("receiveAmountTitle"),
            description: tTour.raw("receiveAmountDescription"),
            side: "top",
            align: "center",
          },
        },
        {
          element: "#wallet-receive-description",
          popover: {
            title: tTour("receiveDescTitle"),
            description: tTour.raw("receiveDescDescription"),
            side: "top",
            align: "center",
          },
        },
        {
          element: "#wallet-receive-button",
          popover: {
            title: tTour("receiveButtonTitle"),
            description: tTour.raw("receiveButtonDescription"),
            side: "top",
            align: "center",
            nextBtnText: tTour("receiveButton"),
          },
        },
      ],
    },
    onBeforeStart: () => {
      document.getElementById("wallet-receive-amount")?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
  });

  return (
    <Card className="rounded-lg mb-6 p-6">
      <CardBody className="p-0">
        <h2 className="text-xl font-bold text-deep px-6 pt-2 pb-4">
          {t("payments.title")}
        </h2>
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={setActiveTab}
          variant="underlined"
          classNames={{
            tabList: "gap-2 sm:gap-6 relative rounded-none px-4 sm:px-6 py-0 overflow-x-auto flex-nowrap w-full",
            cursor: "w-full bg-forest",
            tab: "max-w-fit px-3 sm:px-6 py-4 h-12 shrink-0",
            tabContent: "group-data-[selected=true]:text-forest",
          }}
        >
          <Tab
            key="receive"
            title={(
              <div className="flex items-center space-x-2">
                <ArrowDownLeft className="hidden sm:block w-4 h-4" />
                <span>{t("payments.receive.tabTitle")}</span>
              </div>
            )}
          >
            <ReceiveTab
              invoiceActions={invoiceActions}
            />
          </Tab>

          <Tab
            key="send"
            title={(
              <div className="flex items-center space-x-2">
                <ArrowUpRight className="hidden sm:block w-4 h-4" />
                <span>{t("payments.send.tabTitle")}</span>
              </div>
            )}
          >
            <SendTab
              fetchInfo={fetchInfo}
              fetchTransactions={fetchTransactions}
            />
          </Tab>

          <Tab
            key="history"
            title={(
              <div className="flex items-center space-x-2">
                <History className="hidden sm:block w-4 h-4" />
                <span>{t("payments.history.tabTitle")}</span>
              </div>
            )}
          >
            <HistoryTab
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
