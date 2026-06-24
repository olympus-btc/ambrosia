"use client";

import { useCallback, useMemo } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { usePrinters } from "../../hooks/usePrinter";

export function useCustomerReceipt() {
  const paymentTranslations = useTranslations("cart.payment");
  const { printTicket, printerConfigs, loadingConfigs } = usePrinters();

  const hasCustomerPrinter = useMemo(() => {
    if (!Array.isArray(printerConfigs)) return false;
    return printerConfigs.some(
      (config) => config?.printerType === "CUSTOMER" && config?.enabled !== false,
    );
  }, [printerConfigs]);

  const printCustomerReceipt = useCallback(
    async ({ items, totalCents, ticketId, invoice }) => {
      if (loadingConfigs || !hasCustomerPrinter) return;
      const ticketData = {
        ticketId: ticketId?.toString() || "",
        tableName: paymentTranslations("receipt.tableName"),
        roomName: "",
        date: new Date().toISOString(),
        items: (items || []).map((item) => ({
          quantity: Number(item.quantity) || 1,
          name: item.name || "",
          price: Number(item.price) / 100,
          comments: [],
        })),
        total: Number(totalCents) / 100,
        invoice: invoice || null,
      };
      try {
        await printTicket({
          templateName: null,
          ticketData,
          printerType: "CUSTOMER",
          broadcast: false,
        });
      } catch (err) {
        console.error("Error printing customer ticket:", err);
        addToast({
          color: "warning",
          description: paymentTranslations("errors.printCustomer"),
        });
      }
    },
    [hasCustomerPrinter, loadingConfigs, printTicket, paymentTranslations],
  );

  return { printCustomerReceipt };
}
