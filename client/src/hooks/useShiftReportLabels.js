import { useMemo } from "react";

import { useTranslations } from "next-intl";

import { TRANSLATABLE_PAYMENT_METHOD_NAMES } from "@/components/pages/Store/Cart/utils/paymentMethods";
import { usePaymentMethodLabel } from "@/hooks/usePaymentMethodLabel";

export function useShiftReportLabels() {
  const shiftReportTranslations = useTranslations("ticketPrint.shiftReport");
  const { getPaymentMethodLabel } = usePaymentMethodLabel();

  return useMemo(() => ({
    title: shiftReportTranslations("title"),
    cashier: shiftReportTranslations("cashier"),
    openedAt: shiftReportTranslations("openedAt"),
    closedAt: shiftReportTranslations("closedAt"),
    tickets: shiftReportTranslations("tickets"),
    totalSales: shiftReportTranslations("totalSales"),
    tips: shiftReportTranslations("tips"),
    initialAmount: shiftReportTranslations("initialAmount"),
    cashSales: shiftReportTranslations("cashSales"),
    cashRefunds: shiftReportTranslations("cashRefunds"),
    expectedCash: shiftReportTranslations("expectedCash"),
    countedCash: shiftReportTranslations("countedCash"),
    difference: shiftReportTranslations("difference"),
    paymentMethods: Object.fromEntries(
      TRANSLATABLE_PAYMENT_METHOD_NAMES.map((paymentMethodName) => [paymentMethodName, getPaymentMethodLabel(paymentMethodName)]),
    ),
  }), [shiftReportTranslations, getPaymentMethodLabel]);
}
