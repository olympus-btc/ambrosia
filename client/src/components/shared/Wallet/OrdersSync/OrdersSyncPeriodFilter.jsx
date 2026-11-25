"use client";
import { useTranslations } from "next-intl";

import { buildPeriodLabels, PeriodRangeFilter } from "@/components/shared/PeriodRangeFilter";

export function OrdersSyncPeriodFilter({
  activePeriod,
  dateRangeValue,
  onPeriodChange,
  onDateRangeChange,
  isDisabled = false,
}) {
  const walletTranslations = useTranslations("wallet");

  const periodLabels = buildPeriodLabels((period) => walletTranslations(`ordersSync.period.${period}`));

  const customRangeLabel = `${dateRangeValue.start.toString()} – ${dateRangeValue.end.toString()}`;

  return (
    <PeriodRangeFilter
      activePeriod={activePeriod}
      customRangeLabel={customRangeLabel}
      dateRangeValue={dateRangeValue}
      onPeriodChange={onPeriodChange}
      onDateRangeChange={onDateRangeChange}
      isDisabled={isDisabled}
      title={walletTranslations("ordersSync.periodFilter.title")}
      subtitle={walletTranslations("ordersSync.periodFilter.subtitle")}
      dateRangeLabel={walletTranslations("ordersSync.dateRangeLabel")}
      periodLabels={periodLabels}
      triggerClassName="bg-green-800"
      activePeriodClassName="bg-green-800"
    />
  );
}
