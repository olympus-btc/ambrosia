"use client";

import { useCallback, useMemo } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { usePaymentMethodLabel } from "@/hooks/usePaymentMethodLabel";
import { useTicketLabels } from "@/hooks/useTicketLabels";

import { usePrinters } from "./usePrinter";

export function useCustomerReceipt() {
  const paymentTranslations = useTranslations("cart.payment");
  const { printTicket, printerConfigs, loadingConfigs } = usePrinters();
  const { getPaymentMethodLabel } = usePaymentMethodLabel();
  const ticketLabels = useTicketLabels();

  const hasCustomerPrinter = useMemo(() => {
    if (!Array.isArray(printerConfigs)) return false;
    return printerConfigs.some(
      (config) => config?.printerType === "CUSTOMER" && config?.enabled !== false,
    );
  }, [printerConfigs]);

  const printCustomerReceipt = useCallback(
    async ({ items, totalCents, discountAmountCents, tipAmountCents, ticketId, invoice, paymentMethodName, issuedAt }) => {
      if (loadingConfigs || !hasCustomerPrinter) return false;
      const ticketData = {
        ticketId: ticketId?.toString() || "",
        tableName: paymentTranslations("receipt.tableName"),
        roomName: "",
        date: issuedAt ?? new Date().toISOString(),
        items: (items || []).map((item) => ({
          quantity: Number(item.quantity) || 1,
          name: item.name || "",
          price: Number(item.price) / 100,
          comments: [],
        })),
        total: Number(totalCents) / 100,
        discountAmount: Number(discountAmountCents ?? 0) / 100,
        tipAmount: Number(tipAmountCents ?? 0) / 100,
        invoice: invoice || null,
        paymentMethod: getPaymentMethodLabel(paymentMethodName) || null,
        issuedAt: issuedAt ?? null,
        labels: ticketLabels,
      };
      try {
        await printTicket({
          templateName: null,
          ticketType: "RECEIPT",
          ticketData,
          printerType: "CUSTOMER",
          broadcast: false,
        });
        return true;
      } catch (customerReceiptPrintError) {
        console.error("Error printing customer ticket:", customerReceiptPrintError);
        addToast({
          color: "warning",
          description: paymentTranslations("errors.printCustomer"),
        });
        return false;
      }
    },
    [hasCustomerPrinter, loadingConfigs, printTicket, paymentTranslations, getPaymentMethodLabel, ticketLabels],
  );

  return { printCustomerReceipt, hasCustomerPrinter, loadingConfigs };
}
