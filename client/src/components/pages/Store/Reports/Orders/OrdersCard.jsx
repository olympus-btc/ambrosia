"use client";
import { Card, CardBody } from "@heroui/react";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatusChip } from "@/components/shared/StatusChip";
import { ViewButton } from "@/components/shared/ViewButton";
import formatDate from "@lib/formatDate";

import { refundedToStatus } from "../utils/refundedToStatus";

export function OrdersCard({ order, formatCurrency, onClick }) {
  const reportsTranslations = useTranslations("reports");
  const { shortId, userName, paymentMethod, date, itemCount, total, refunded } = order;

  return (
    <Card shadow="none" className="border border-gray-200 rounded-lg">
      <CardBody className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-2">
          <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            #{shortId}
          </span>
          <StatusChip status={refundedToStatus(refunded)} />
        </div>
        <div className="flex flex-row items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-sm text-forest">
              <Users aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span className="truncate">{userName ?? "—"}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
              <span className="text-xs text-gray-500">{paymentMethod}</span>
              <span className="text-xs text-gray-400">{date ? formatDate(date) : "—"}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-gray-500">×{itemCount} {reportsTranslations("sales.quantity").toLowerCase()}</p>
            <p className="text-sm font-bold text-green-700 mb-1">{formatCurrency(total)}</p>
            <ViewButton onPress={onClick}>{reportsTranslations("orders.view")}</ViewButton>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
