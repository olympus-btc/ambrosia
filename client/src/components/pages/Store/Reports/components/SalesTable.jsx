"use client";
import { Card, CardBody } from "@heroui/react";
import { Package, ShoppingBag, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import formatDate from "@lib/formatDate";

import { PaymentBadge } from "./PaymentBadge";

export function SalesTable({ sales, formatCurrency }) {
  const t = useTranslations("reports");

  if (!sales?.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">{t("sales.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
      {sales.map((sale, i) => (
        <Card key={i} className="bg-gray-50 border">
          <CardBody className="p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <div className="bg-forest/10 rounded-lg p-2 shrink-0">
                  <Package className="w-4 h-4 text-forest" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-deep truncate">{sale.productName}</p>
                  <div className="flex items-center gap-1 text-sm text-forest mt-0.5">
                    <Users className="w-3 h-3 shrink-0" />
                    <span className="truncate">{sale.userName}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-x-4 gap-y-1 text-sm shrink-0">
                <div className="text-center">
                  <p className="text-gray-500 text-xs">{t("sales.quantity")}</p>
                  <p className="font-bold text-deep">×{sale.quantity}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs">{t("sales.price")}</p>
                  <p className="font-bold text-deep">{formatCurrency(sale.priceAtOrder)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-xs">{t("sales.total")}</p>
                  <p className="font-bold text-green-700">{formatCurrency(sale.priceAtOrder * sale.quantity)}</p>
                </div>
                <PaymentBadge method={sale.paymentMethod} />
                <span className="text-gray-400 text-xs">{sale.saleDate ? formatDate(sale.saleDate) : "-"}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
