"use client";
import { useMemo } from "react";

export function useOrdersData(sales) {
  return useMemo(() => {
    const byOrder = {};
    for (const sale of sales) {
      if (!byOrder[sale.orderId]) {
        byOrder[sale.orderId] = {
          orderId: sale.orderId,
          shortId: sale.orderId.slice(-8),
          date: sale.saleDate,
          userName: sale.userName,
          paymentMethod: sale.paymentMethod,
          items: [],
          total: 0,
          itemCount: 0,
        };
      }
      byOrder[sale.orderId].items.push({
        productName: sale.productName,
        quantity: sale.quantity,
        priceAtOrder: sale.priceAtOrder,
      });
      byOrder[sale.orderId].total += sale.quantity * sale.priceAtOrder;
      byOrder[sale.orderId].itemCount += sale.quantity;
    }
    return Object.values(byOrder).sort((a, b) => b.date.localeCompare(a.date));
  }, [sales]);
}
