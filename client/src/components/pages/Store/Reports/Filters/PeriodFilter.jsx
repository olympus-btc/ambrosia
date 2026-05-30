"use client";
import { useState } from "react";

import { Button, DateRangePicker, Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { Calendar, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { useDateRangeFilters } from "../hooks/useFilters";

const PERIODS = ["week", "month", "year"];

export function PeriodFilter({ filters, onFiltersChange, disabled }) {
  const reportsTranslations = useTranslations("reports");
  const [isOpen, setIsOpen] = useState(false);
  const { dateRangeValue, handlePeriodChange, handleDateRangeChange } =
    useDateRangeFilters(filters, onFiltersChange);

  const currentLabel = filters.activePeriod
    ? reportsTranslations(`dates.period.${filters.activePeriod}`)
    : filters.startDate && filters.endDate
      ? `${filters.startDate} – ${filters.endDate}`
      : reportsTranslations("dates.title");

  const handlePeriodSelect = (period) => {
    handlePeriodChange(period);
    setIsOpen(false);
  };

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen} placement="bottom-end">
      <PopoverTrigger>
        <Button
          color="primary"
          radius="md"
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
            <p className="text-sm font-semibold text-green-900">{reportsTranslations("dates.title")}</p>
            <p className="text-xs text-default-500">{reportsTranslations("dates.subtitle")}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PERIODS.map((period) => (
              <Button
                key={period}
                color={filters.activePeriod === period ? "primary" : undefined}
                className={filters.activePeriod === period ? "" : "bg-slate-100"}
                radius="md"
                size="sm"
                onPress={() => handlePeriodSelect(period)}
                isDisabled={disabled}
              >
                {reportsTranslations(`dates.period.${period}`)}
              </Button>
            ))}
          </div>

          <DateRangePicker
            aria-label={reportsTranslations("dates.title")}
            label={reportsTranslations("dates.title")}
            value={dateRangeValue}
            onChange={handleDateRangeChange}
            isDisabled={disabled}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
