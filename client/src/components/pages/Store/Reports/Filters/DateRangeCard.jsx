"use client";
import { useState } from "react";

import { Button, DateRangePicker, Input, Select, SelectItem } from "@heroui/react";
import { Bitcoin, Banknote, CreditCard, Calendar, Search, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { useDateRangeFilters } from "../hooks/useFilters";

const PERIODS = ["week", "month", "year"];

const PAYMENT_OPTIONS = [
  { paymentOptionValue: "all", localeKey: "all", icon: <Search className="w-4 h-4" /> },
  { paymentOptionValue: "Cash", localeKey: "cash", icon: <Banknote className="w-4 h-4" /> },
  { paymentOptionValue: "BTC", localeKey: "btc", icon: <Bitcoin className="w-4 h-4" /> },
  { paymentOptionValue: "Debit Card", localeKey: "debitCard", icon: <CreditCard className="w-4 h-4" /> },
  { paymentOptionValue: "Credit Card", localeKey: "creditCard", icon: <CreditCard className="w-4 h-4" /> },
];

export function DateRangeCard({ filters, onFiltersChange, disabled }) {
  const t = useTranslations("reports");
  const [isOpen, setIsOpen] = useState(true);
  const { activeFilterCount, dateRangeValue, handlePeriodChange, handleDateRangeChange, handlePaymentMethod } =
    useDateRangeFilters(filters, onFiltersChange);

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <Input
          isClearable
          className="w-full lg:flex-1"
          label={t("filters.productName")}
          placeholder={t("filters.productNamePlaceholder")}
          value={filters.productName}
          onChange={(e) => onFiltersChange({ productName: e.target.value })}
          onClear={() => onFiltersChange({ productName: "" })}
          isDisabled={disabled}
        />
        <Button
          variant="flat"
          className="lg:w-48 lg:flex-none h-14 justify-between px-3 text-foreground"
          aria-expanded={isOpen}
          endContent={(
            <ChevronDown
              aria-hidden="true"
              className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              strokeWidth={1.5}
            />
          )}
          onPress={() => setIsOpen((open) => !open)}
          isDisabled={disabled}
        >
          {activeFilterCount > 0 ? t("dates.filtersActive", { count: activeFilterCount }) : t("dates.title")}
        </Button>
      </div>

      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="border border-default-200 rounded-xl p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-green-900">{t("dates.title")}</p>
              <p className="text-xs text-default-500">{t("dates.subtitle")}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {PERIODS.map((period) => (
                <Button
                  key={period}
                  variant={filters.activePeriod === period ? "solid" : "flat"}
                  size="md"
                  onPress={() => handlePeriodChange(period)}
                  isDisabled={disabled}
                  className={filters.activePeriod === period ? "bg-green-800 text-white" : "text-foreground"}
                >
                  <div className="flex flex-col items-center">
                    <Calendar aria-hidden="true" className="w-4 h-4 mb-1" />
                    <span>{t(`dates.period.${period}`)}</span>
                  </div>
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateRangePicker
                aria-label={t("dates.title")}
                label={t("dates.title")}
                value={dateRangeValue}
                onChange={handleDateRangeChange}
                isDisabled={disabled}
              />
              <Select
                aria-label={t("filters.paymentMethod")}
                label={t("filters.paymentMethod")}
                selectedKeys={new Set([filters.paymentMethod || "all"])}
                onSelectionChange={handlePaymentMethod}
                isDisabled={disabled}
              >
                {PAYMENT_OPTIONS.map(({ paymentOptionValue, localeKey, icon }) => (
                  <SelectItem key={paymentOptionValue} startContent={icon}>
                    {t(`filters.paymentMethods.${localeKey}`)}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
