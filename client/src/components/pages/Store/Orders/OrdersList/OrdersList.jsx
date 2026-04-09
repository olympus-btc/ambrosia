"use client";

import { useCurrency } from "@/components/hooks/useCurrency";

import { OrdersCard } from "./OrdersCard";
import { OrdersTable } from "./OrdersTable";

export function OrdersList({ orders, onViewOrder }) {
  const { formatAmount } = useCurrency();

  return (
    <section className="w-full">
      <div className="md:hidden space-y-3">
        {orders.map((order) => (
          <OrdersCard
            key={order.id}
            order={order}
            formatAmount={formatAmount}
            onViewOrder={onViewOrder}
          />
        ))}
      </div>

      <div className="hidden md:block">
        <OrdersTable
          orders={orders}
          formatAmount={formatAmount}
          onViewOrder={onViewOrder}
        />
      </div>
    </section>
  );
}
