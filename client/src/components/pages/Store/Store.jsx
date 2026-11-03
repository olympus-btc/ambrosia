"use client";

import { Card, CardHeader, CardBody } from "@heroui/card";
import { Users, Package, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { usePermission } from "@/hooks/usePermission";
import { PageHeader } from "@components/shared/PageHeader";
import { PermissionBlockedMessage } from "@components/shared/PermissionBlockedMessage";

import { useOrders } from "./hooks/useOrders";
import { useProducts } from "./hooks/useProducts";
import { useUsers } from "./hooks/useUsers";

export function Store() {
  const dashboardTranslations = useTranslations("dashboard");
  const { users, forbidden: usersForbidden } = useUsers({ skipForbiddenRedirect: true });
  const { products, forbidden: productsForbidden } = useProducts({ skipForbiddenRedirect: true });
  const { orders, forbidden: ordersForbidden } = useOrders({ skipForbiddenRedirect: true });
  const { formatAmount } = useCurrency();
  const canSeeRevenue = usePermission({ allOf: ["reports_read"] });

  const formatCurrency = (amount) => formatAmount(Math.round(amount * 100));

  const paidOrders = orders?.filter((order) => order.status === "paid") ?? [];
  const netRevenue = paidOrders.reduce((sum, order) => sum + (order.total ?? 0), 0);

  const salesStat = canSeeRevenue
    ? { name: dashboardTranslations("stats.revenue"), quantity: formatCurrency(netRevenue) }
    : { name: dashboardTranslations("stats.sales"), quantity: paidOrders.length };

  const STATS = [
    ...(usersForbidden ? [] : [{
      id: 1,
      name: dashboardTranslations("stats.users"),
      quantity: users?.length,
      icon: Users,
    }]),
    ...(productsForbidden ? [] : [{
      id: 2,
      name: dashboardTranslations("stats.products"),
      quantity: products?.length,
      icon: Package,
    }]),
    ...(ordersForbidden ? [] : [{
      id: 3,
      ...salesStat,
      icon: ShoppingCart,
    }]),
  ];

  return (
    <>
      <PageHeader title={dashboardTranslations("title")} subtitle={dashboardTranslations("subtitle")} />

      {STATS.length === 0 ? (
        <PermissionBlockedMessage
          title={dashboardTranslations("permissionBlocked.title")}
          subtitle={dashboardTranslations("permissionBlocked.subtitle")}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-4 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STATS.map((stat) => (
              <Card key={stat.id} shadow="none" className="border border-gray-200 rounded-lg">
                <CardHeader>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-semibold text-foreground mb-2">{stat.name}</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="flex justify-between items-center">
                    <p className="text-2xl font-bold text-green-900">{stat.quantity}</p>
                    <stat.icon className="w-10 h-10 text-green-800 opacity-50" />
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
