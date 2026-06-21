"use client";
import { useMemo } from "react";

export function useOrdersData(sales) {
  return useMemo(() => {
    const byOrder = {};
    for (const {
      orderId,
      saleDate,
      userName,
      paymentMethod,
      productName,
      quantity,
      priceAtOrder,
      satoshiAmount,
      exchangeRateAtPayment,
      exchangeRateCurrency,
      fiatAmountAtPayment,
    } of sales) {
      if (!byOrder[orderId]) {
        byOrder[orderId] = {
          orderId,
          shortId: orderId.slice(-8),
          date: saleDate,
          userName,
          paymentMethod,
          items: [],
          total: 0,
          itemCount: 0,
          satoshiAmount: satoshiAmount ?? null,
          exchangeRateAtPayment: exchangeRateAtPayment ?? null,
          exchangeRateCurrency: exchangeRateCurrency ?? null,
          fiatAmountAtPayment: fiatAmountAtPayment ?? null,
        };
      }
      byOrder[orderId].items.push({ productName, quantity, priceAtOrder });
      byOrder[orderId].total += quantity * priceAtOrder;
      byOrder[orderId].itemCount += quantity;
    }
    return Object.values(byOrder).sort((a, b) => b.date.localeCompare(a.date));
  }, [sales]);
}
