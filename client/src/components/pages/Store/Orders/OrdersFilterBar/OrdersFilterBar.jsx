"use client";

import { useMemo, useState } from "react";

import { Button, Input, Select, SelectItem } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdvancedFiltersPanel } from "./AdvancedFiltersPanel";

export function OrdersFilterBar({
  searchTerm,
  rowsPerPage,
  filters,
  paymentMethods = [],
  onSearchChange,
  onRowsPerPageChange,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
}) {
  const t = useTranslations("orders");
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = useMemo(() => [
    filters.status,
    filters.paymentMethod,
    filters.startDate,
    filters.endDate,
    filters.minTotal,
    filters.maxTotal,
    filters.sortBy && filters.sortBy !== "date" ? filters.sortBy : null,
    filters.sortOrder && filters.sortOrder !== "desc" ? filters.sortOrder : null,
  ].filter(Boolean).length, [filters]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <Input
          isClearable
          className="w-full lg:flex-1"
          label={t("filter.searchLabel")}
          placeholder={t("filter.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange("")}
        />
        <div className="flex flex-col sm:flex-row gap-3 lg:contents">
          <Select
            aria-label="Rows per page"
            label={t("filter.rowsPerPage")}
            selectedKeys={[rowsPerPage.toString()]}
            onSelectionChange={(keys) => onRowsPerPageChange(Array.from(keys)[0])}
            className="flex-1 lg:w-48 lg:flex-none"
          >
            {[5, 10, 20, 50].map((count) => (
              <SelectItem key={count.toString()} value={count.toString()}>
                {t("filter.rowsOption", { count })}
              </SelectItem>
            ))}
          </Select>

          <Button
            variant="flat"
            className="md:flex-1 lg:w-48 lg:flex-none h-14 justify-between px-3 text-foreground"
            endContent={<ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />}
            onPress={() => setIsOpen((v) => !v)}
          >
            {activeFilterCount > 0
              ? t("filter.moreFiltersActive", { count: activeFilterCount })
              : t("filter.moreFilters")}
          </Button>
        </div>
      </div>

      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <AdvancedFiltersPanel
            filters={filters}
            paymentMethods={paymentMethods}
            onFiltersChange={onFiltersChange}
            onApplyFilters={onApplyFilters}
            onClearFilters={onClearFilters}
          />
        </div>
      </div>
    </div>
  );
}
