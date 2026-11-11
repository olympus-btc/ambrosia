"use client";
import { useCallback, useState } from "react";

import { Button, Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { getOrdersSyncFindings } from "@/services/ordersSyncService";

import { useOrdersSyncDateRange } from "./hooks/useOrdersSyncDateRange";
import { OrdersSyncPeriodFilter } from "./OrdersSyncPeriodFilter";

export function OrdersSyncCard() {
  const walletTranslations = useTranslations("wallet");
  const { activePeriod, dateRangeValue, handlePeriodChange, handleDateRangeChange } = useOrdersSyncDateRange();
  const [findings, setFindings] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const handleSync = useCallback(async () => {
    if (!dateRangeValue?.start || !dateRangeValue?.end) return;

    setIsSyncing(true);
    setSyncError(null);
    try {
      const loadedFindings = await getOrdersSyncFindings(
        dateRangeValue.start.toString(),
        dateRangeValue.end.toString(),
      );
      setFindings(loadedFindings);
    } catch (syncFindingsError) {
      setSyncError(syncFindingsError);
    } finally {
      setIsSyncing(false);
    }
  }, [dateRangeValue]);

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg mt-6">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {walletTranslations("ordersSync.title")}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          {walletTranslations("ordersSync.subtitle")}
        </p>
      </CardHeader>

      <CardBody className="space-y-4">
        <div className="flex flex-col items-start gap-3">
          <OrdersSyncPeriodFilter
            activePeriod={activePeriod}
            dateRangeValue={dateRangeValue}
            onPeriodChange={handlePeriodChange}
            onDateRangeChange={handleDateRangeChange}
            isDisabled={isSyncing}
          />
          <Button
            color="primary"
            className="bg-green-800 h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium"
            onPress={handleSync}
            isLoading={isSyncing}
          >
            {walletTranslations("ordersSync.syncButton")}
          </Button>
        </div>

        {syncError && (
          <p className="text-sm text-rose-600">{walletTranslations("ordersSync.loadError")}</p>
        )}

        {findings && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-green-900">
                {walletTranslations("ordersSync.paymentsWithoutOrder.title")} ({findings.paymentsWithoutOrder.length})
              </p>
              {findings.paymentsWithoutOrder.length === 0 ? (
                <p className="text-xs text-gray-400 mt-1">{walletTranslations("ordersSync.paymentsWithoutOrder.empty")}</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {findings.paymentsWithoutOrder.map((paymentWithoutOrder) => (
                    <li key={paymentWithoutOrder.paymentHash} className="text-xs text-gray-700">
                      {paymentWithoutOrder.receivedSat} sats — {paymentWithoutOrder.paymentHash}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-green-900">
                {walletTranslations("ordersSync.misdatedOrders.title")} ({findings.misdatedOrders.length})
              </p>
              {findings.misdatedOrders.length === 0 ? (
                <p className="text-xs text-gray-400 mt-1">{walletTranslations("ordersSync.misdatedOrders.empty")}</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {findings.misdatedOrders.map((misdatedOrder) => (
                    <li key={misdatedOrder.paymentId} className="text-xs text-gray-700">
                      {misdatedOrder.recordedDate}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
