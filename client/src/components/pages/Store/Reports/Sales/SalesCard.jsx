"use client";

import { Card, CardBody } from "@heroui/react";
import { Package, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import formatDate from "@lib/formatDate";

import { PaymentBadge } from "./PaymentBadge";

export function SalesCard({ sale, formatCurrency }) {
  const t = useTranslations("reports");
  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody className="flex flex-row items-center gap-3 p-3">
        <div className="bg-forest/10 rounded-lg p-2 shrink-0">
          <Package className="w-4 h-4 text-forest" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-deep truncate">{sale.productName}</p>
          <div className="flex items-center gap-1 text-sm text-forest mt-0.5">
            <Users className="w-3 h-3 shrink-0" />
            <span className="truncate">{sale.userName}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <PaymentBadge method={sale.paymentMethod} />
            <span className="text-xs text-gray-400">
              {sale.saleDate ? formatDate(sale.saleDate) : "-"}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-gray-500">{t("sales.quantity")} ×{sale.quantity}</p>
          <p className="text-sm font-bold text-green-700">
            {formatCurrency(sale.priceAtOrder * sale.quantity)}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
