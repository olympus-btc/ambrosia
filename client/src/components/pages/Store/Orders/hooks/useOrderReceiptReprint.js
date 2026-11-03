"use client";

import { useCallback, useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useCustomerReceipt } from "../../hooks/useCustomerReceipt";

const REPRINTABLE_STATUSES = ["paid", "refunded"];

const toCents = (amount) => Math.round(Number(amount ?? 0) * 100);

export function buildOrderReceipt(order) {
  return {
    items: (order.items ?? []).map((orderItem) => ({
      name: orderItem.productName,
      quantity: orderItem.quantity,
      price: orderItem.priceAtOrder,
    })),
    totalCents: toCents(order.total),
    discountAmountCents: Number(order.discountAmount ?? 0),
    tipAmountCents: toCents(order.tipAmount),
    paymentMethodName: order.paymentMethod,
    issuedAt: order.createdAt,
  };
}

export function useOrderReceiptReprint(order) {
  const ordersTranslations = useTranslations("orders");
  const { printCustomerReceipt, hasCustomerPrinter, loadingConfigs } = useCustomerReceipt();
  const [isReprinting, setIsReprinting] = useState(false);

  const canReprint = Boolean(
    order && !loadingConfigs && hasCustomerPrinter && REPRINTABLE_STATUSES.includes(order.status),
  );

  const reprintReceipt = useCallback(async () => {
    if (!canReprint) return;
    setIsReprinting(true);
    try {
      const isPrinted = await printCustomerReceipt(buildOrderReceipt(order));
      if (isPrinted) {
        addToast({ color: "success", description: ordersTranslations("details.reprintSuccess") });
      }
    } finally {
      setIsReprinting(false);
    }
  }, [canReprint, order, printCustomerReceipt, ordersTranslations]);

  return { canReprint, isReprinting, reprintReceipt };
}
