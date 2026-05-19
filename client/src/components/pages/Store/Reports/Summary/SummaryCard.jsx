"use client";
import { Card, CardBody } from "@heroui/react";
import { DollarSign, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSummaryData } from "../hooks/useSummaryData";

import { SummaryStat } from "./SummaryStat";

export function SummaryCard({ reportData, formatCurrency }) {
  const t = useTranslations("reports");
  const { totalRevenue, totalItems } = useSummaryData(reportData);
  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SummaryStat
            icon={<DollarSign className="w-6 h-6 text-green-600" />}
            label={t("summary.revenue")}
            value={formatCurrency(totalRevenue)}
            tone={{
              bg: "bg-green-50",
              border: "border-green-200",
              iconBg: "bg-green-100",
              text: "text-green-700",
              value: "text-green-900",
            }}
          />
          <SummaryStat
            icon={<ShoppingCart className="w-6 h-6 text-purple-600" />}
            label={t("summary.items")}
            value={totalItems}
            tone={{
              bg: "bg-purple-50",
              border: "border-purple-200",
              iconBg: "bg-purple-100",
              text: "text-purple-700",
              value: "text-purple-900",
            }}
          />
        </div>
      </CardBody>
    </Card>
  );
}
