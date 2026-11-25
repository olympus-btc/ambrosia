"use client";
import { useTranslations } from "next-intl";

import { buildPeriodLabels, PeriodRangeFilter } from "@/components/shared/PeriodRangeFilter";

import { useDateRangeFilters } from "../hooks/useFilters";

export function PeriodFilter({ filters, onFiltersChange, disabled, subtitle }) {
  const reportsTranslations = useTranslations("reports");
  const { dateRangeValue, handlePeriodChange, handleDateRangeChange } =
    useDateRangeFilters(filters, onFiltersChange);

  const periodLabels = buildPeriodLabels((period) => reportsTranslations(`dates.period.${period}`));

  const customRangeLabel = filters.startDate && filters.endDate
    ? `${filters.startDate} – ${filters.endDate}`
    : null;

  return (
    <PeriodRangeFilter
      activePeriod={filters.activePeriod}
      customRangeLabel={customRangeLabel}
      dateRangeValue={dateRangeValue}
      onPeriodChange={handlePeriodChange}
      onDateRangeChange={handleDateRangeChange}
      isDisabled={disabled}
      title={reportsTranslations("dates.title")}
      subtitle={subtitle ?? reportsTranslations("dates.subtitle")}
      dateRangeLabel={reportsTranslations("dates.title")}
      periodLabels={periodLabels}
      placement="bottom-end"
    />
  );
}
