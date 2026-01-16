"use client";

import { Card, CardHeader, CardBody } from "@heroui/card";
import { Users, Package, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

import { useOrders } from "./hooks/useOrders";
import { useProducts } from "./hooks/useProducts";
import { useUsers } from "./hooks/useUsers";
import { StoreLayout } from "./StoreLayout";

export function Store() {
  const t = useTranslations("dashboard");
  const { users } = useUsers();
  const { products } = useProducts();
  const { orders } = useOrders();

  const paidOrdersCount = orders?.filter((order) => order.status === "paid")?.length || 0;

  const STATS = [
    {
      id: 1,
      name: t("stats.users"),
      quantity: users?.length,
      icon: Users,
    },
    {
      id: 2,
      name: t("stats.products"),
      quantity: products?.length,
      icon: Package,
    },
    {
      id: 3,
      name: t("stats.sales"),
      quantity: paidOrdersCount,
      icon: ShoppingCart,
    },
  ];

  return (
    <StoreLayout>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-semibold text-green-800">{t("title")}</h1>
          <p className=" text-gray-800 mt-4">
            {t("subtitle")}
          </p>
        </div>
      </header>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {
            STATS.map((stat) => (
              <Card key={stat.id}>
                <CardHeader>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-semibold text-foreground mb-2">{stat.name}</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="flex justify-between items-center">
                    <p className="text-2xl font-bold">
                      {stat.quantity}
                    </p>
                    <stat.icon className="w-10 h-10 opacity-25" />
                  </div>
                </CardBody>
              </Card>
            ))
          }
        </div>
      </div>
    </StoreLayout>
  );
}
