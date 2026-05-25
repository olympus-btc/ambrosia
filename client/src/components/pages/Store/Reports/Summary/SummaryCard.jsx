"use client";
import { useTranslations } from "next-intl";

import { useSummaryData } from "../hooks/useSummaryData";

import { SummaryStat } from "./SummaryStat";

const TONE = {
  bg: "bg-white",
  border: "border-default-100",
  iconBg: "bg-green-100",
  text: "text-default-500",
  value: "text-default-900",
};

export function SummaryCard({ reportData, formatCurrency }) {
  const t = useTranslations("reports");
  const { totalRevenue, totalItems, transactionCount, avgTicket } = useSummaryData(reportData);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryStat label={t("summary.revenue")} value={formatCurrency(totalRevenue)} tone={TONE} />
      <SummaryStat label={t("summary.items")} value={totalItems} tone={TONE} />
      <SummaryStat label={t("summary.transactions")} value={transactionCount} tone={TONE} />
      <SummaryStat label={t("summary.avgTicket")} value={formatCurrency(avgTicket)} tone={TONE} />
    </div>
  );
}
