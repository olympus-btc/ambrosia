"use client";
import { useState } from "react";

import { Button, DateRangePicker, Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { Calendar, ChevronDown } from "lucide-react";

export const PERIODS = ["day", "week", "month", "year"];

export function buildPeriodLabels(translatePeriod) {
  return Object.fromEntries(PERIODS.map((period) => [period, translatePeriod(period)]));
}

export function PeriodRangeFilter({
  activePeriod,
  customRangeLabel,
  dateRangeValue,
  onPeriodChange,
  onDateRangeChange,
  isDisabled = false,
  title,
  subtitle,
  dateRangeLabel,
  periodLabels,
  placement = "bottom-start",
  triggerClassName = "",
  activePeriodClassName = "",
}) {
  const [isOpen, setIsOpen] = useState(false);

  const currentLabel = activePeriod ? periodLabels[activePeriod] : customRangeLabel || title;

  const handlePeriodSelect = (period) => {
    onPeriodChange(period);
    setIsOpen(false);
  };

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen} placement={placement}>
      <PopoverTrigger>
        <Button
          color="primary"
          className={triggerClassName}
          radius="md"
          startContent={<Calendar aria-hidden="true" className="w-4 h-4" />}
          endContent={(
            <ChevronDown
              aria-hidden="true"
              className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              strokeWidth={1.5}
            />
          )}
          isDisabled={isDisabled}
          aria-expanded={isOpen}
        >
          {currentLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-4 w-80">
        <div className="space-y-4 w-full">
          <div>
            <p className="text-sm font-semibold text-green-900">{title}</p>
            <p className="text-xs text-default-500">{subtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PERIODS.map((period) => (
              <Button
                key={period}
                color={activePeriod === period ? "primary" : undefined}
                className={activePeriod === period ? activePeriodClassName : "bg-slate-100"}
                radius="md"
                size="sm"
                onPress={() => handlePeriodSelect(period)}
                isDisabled={isDisabled}
              >
                {periodLabels[period]}
              </Button>
            ))}
          </div>

          <DateRangePicker
            aria-label={dateRangeLabel}
            label={dateRangeLabel}
            value={dateRangeValue}
            onChange={onDateRangeChange}
            isDisabled={isDisabled}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
