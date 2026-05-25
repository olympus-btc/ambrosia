"use client";
import { useState } from "react";

import { Button, DateRangePicker, Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { Calendar, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { useDateRangeFilters } from "../hooks/useFilters";

const PERIODS = ["week", "month", "year"];

export function PeriodFilter({ filters, onFiltersChange, disabled }) {
  const t = useTranslations("reports");
  const [isOpen, setIsOpen] = useState(false);
  const { dateRangeValue, handlePeriodChange, handleDateRangeChange } =
    useDateRangeFilters(filters, onFiltersChange);

  const currentLabel = filters.activePeriod
    ? t(`dates.period.${filters.activePeriod}`)
    : filters.startDate && filters.endDate
      ? `${filters.startDate} – ${filters.endDate}`
      : t("dates.title");

  const handlePeriodSelect = (period) => {
    handlePeriodChange(period);
    setIsOpen(false);
  };

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen} placement="bottom-end">
      <PopoverTrigger>
        <Button
          color="primary"
          startContent={<Calendar aria-hidden="true" className="w-4 h-4" />}
          endContent={(
            <ChevronDown
              aria-hidden="true"
              className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              strokeWidth={1.5}
            />
          )}
          isDisabled={disabled}
          aria-expanded={isOpen}
        >
          {currentLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-4 w-80">
        <div className="space-y-4 w-full">
          <div>
            <p className="text-sm font-semibold text-green-900">{t("dates.title")}</p>
            <p className="text-xs text-default-500">{t("dates.subtitle")}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PERIODS.map((period) => (
              <Button
                key={period}
                color={filters.activePeriod === period ? "primary" : undefined}
                className={filters.activePeriod === period ? "" : "bg-slate-100"}
                radius="full"
                size="sm"
                onPress={() => handlePeriodSelect(period)}
                isDisabled={disabled}
              >
                <div className="flex flex-col items-center">
                  <Calendar aria-hidden="true" className="w-3 h-3 mb-0.5" />
                  <span className="text-xs">{t(`dates.period.${period}`)}</span>
                </div>
              </Button>
            ))}
          </div>

          <DateRangePicker
            aria-label={t("dates.title")}
            label={t("dates.title")}
            value={dateRangeValue}
            onChange={handleDateRangeChange}
            isDisabled={disabled}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
