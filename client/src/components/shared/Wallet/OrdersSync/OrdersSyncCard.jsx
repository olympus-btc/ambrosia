"use client";
import { useCallback, useMemo, useState } from "react";

import { Button, Card, CardBody, CardHeader, Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { usePaymentMethods } from "@/components/pages/Store/Cart/hooks/usePaymentMethod";
import { classifyPaymentMethod, PAYMENT_METHODS } from "@/components/pages/Store/Cart/utils/paymentMethods";
import { useCategories } from "@/components/pages/Store/hooks/useCategories";
import { useProducts } from "@/components/pages/Store/hooks/useProducts";
import { useAuth } from "@/hooks/auth/useAuth";
import { getOrdersSyncFindings } from "@/services/ordersSyncService";

import { useOrdersSyncDateRange } from "./hooks/useOrdersSyncDateRange";
import { MisdatedOrderRow } from "./MisdatedOrderRow";
import { OrdersSyncPeriodFilter } from "./OrdersSyncPeriodFilter";
import { PaymentWithoutOrderEditor } from "./PaymentWithoutOrderEditor/PaymentWithoutOrderEditor";

export function OrdersSyncCard() {
  const walletTranslations = useTranslations("wallet");
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { products } = useProducts({ skipForbiddenRedirect: true });
  const { categories } = useCategories();
  const { paymentMethods } = usePaymentMethods();
  const { activePeriod, dateRangeValue, handlePeriodChange, handleDateRangeChange } = useOrdersSyncDateRange();
  const [findings, setFindings] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);

  const bitcoinPaymentMethodId = useMemo(
    () => paymentMethods.find((paymentMethod) => classifyPaymentMethod(paymentMethod.name) === PAYMENT_METHODS.BTC)?.id ?? null,
    [paymentMethods],
  );

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

  const handlePaymentConfirmed = useCallback(() => {
    setEditingPayment(null);
    handleSync();
  }, [handleSync]);

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
                    <li key={paymentWithoutOrder.paymentHash}>
                      <button
                        type="button"
                        className="text-xs text-gray-700 underline hover:text-green-900"
                        onClick={() => setEditingPayment(paymentWithoutOrder)}
                      >
                        {paymentWithoutOrder.receivedSat} sats — {paymentWithoutOrder.paymentHash}
                      </button>
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
                    <MisdatedOrderRow
                      key={misdatedOrder.paymentId}
                      misdatedOrder={misdatedOrder}
                      onCorrected={handleSync}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardBody>

      <Modal isOpen={Boolean(editingPayment)} onClose={() => setEditingPayment(null)} size="3xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{walletTranslations("ordersSync.paymentWithoutOrderEditor.title")}</ModalHeader>
          <ModalBody className="pb-6">
            {editingPayment && (
              <PaymentWithoutOrderEditor
                payment={editingPayment}
                products={products}
                categories={categories}
                currencyAcronym={currency.acronym.toLowerCase()}
                currencyId={currency.id}
                paymentMethodId={bitcoinPaymentMethodId}
                userId={user.userId}
                onConfirmed={handlePaymentConfirmed}
                onCancel={() => setEditingPayment(null)}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Card>
  );
}
