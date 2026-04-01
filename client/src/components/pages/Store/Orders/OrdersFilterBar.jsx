"use client";

import { useState } from "react";

import { Button, Input, NumberInput, Popover, PopoverContent, PopoverTrigger, Select, SelectItem } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const activeFilterCount =
    [
      filters.status,
      filters.paymentMethod,
      filters.startDate,
      filters.endDate,
      filters.minTotal,
      filters.maxTotal,
      filters.sortBy && filters.sortBy !== "date" ? filters.sortBy : null,
      filters.sortOrder && filters.sortOrder !== "desc" ? filters.sortOrder : null,
    ].filter(Boolean).length;

  const updateFilter = (key, value) => {
    onFiltersChange({
      [key]: value === "" ? null : value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 md:items-end">
        <Input
          isClearable
          className="flex-1"
          label={t("filter.searchLabel")}
          placeholder={t("filter.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange("")}
        />
        <Select
          aria-label="Rows per page"
          label={t("filter.rowsPerPage")}
          selectedKeys={[rowsPerPage.toString()]}
          onSelectionChange={(keys) => onRowsPerPageChange(Array.from(keys)[0])}
          className="w-full md:w-48"
        >
          {[5, 10, 20, 50].map((count) => (
            <SelectItem key={count.toString()} value={count.toString()}>
              {t("filter.rowsOption", { count })}
            </SelectItem>
          ))}
        </Select>

        <div className="w-full md:w-48">
          <Popover placement="bottom-end" onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger>
              <Button
                variant="flat"
                className="h-14 w-full justify-between px-4 hover:bg-gray-200"
                endContent={<ChevronDown className={`w-4 h-4 text-foreground transition-transform duration-200 ${isPopoverOpen ? "rotate-180" : ""}`} strokeWidth={1} />}
              >
                {activeFilterCount > 0
                  ? t("filter.moreFiltersActive", { count: activeFilterCount })
                  : t("filter.moreFilters")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(92vw,56rem)] p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t("filter.advancedTitle")}
                    </p>
                    <p className="text-xs text-default-500">
                      {t("filter.advancedSubtitle")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Select
                    aria-label="Status"
                    label={t("filter.statusLabel")}
                    selectedKeys={[filters.status ?? "__all__"]}
                    onSelectionChange={(keys) => {
                      const nextValue = Array.from(keys)[0];
                      updateFilter("status", nextValue === "__all__" ? null : nextValue || null);
                    }}
                  >
                    <SelectItem key="__all__" value="">
                      {t("filter.allStatuses")}
                    </SelectItem>
                    {["open", "closed", "paid"].map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`status.${status}`)}
                      </SelectItem>
                    ))}
                  </Select>

                  <Select
                    aria-label="Payment method"
                    label={t("filter.paymentMethodLabel")}
                    selectedKeys={[filters.paymentMethod ?? "__all__"]}
                    onSelectionChange={(keys) => {
                      const nextValue = Array.from(keys)[0];
                      updateFilter("paymentMethod", nextValue === "__all__" ? null : nextValue || null);
                    }}
                  >
                    <SelectItem key="__all__" value="">
                      {t("filter.allPaymentMethods")}
                    </SelectItem>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.name} value={method.name}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </Select>

                  <Input
                    type="date"
                    label={t("filter.startDateLabel")}
                    value={filters.startDate ?? ""}
                    onChange={(e) => updateFilter("startDate", e.target.value)}
                  />

                  <Input
                    type="date"
                    label={t("filter.endDateLabel")}
                    value={filters.endDate ?? ""}
                    onChange={(e) => updateFilter("endDate", e.target.value)}
                  />

                  <NumberInput
                    label={t("filter.minTotalLabel")}
                    placeholder={t("filter.totalPlaceholder")}
                    variant="flat"
                    classNames={{
                      inputWrapper: "shadow-none",
                      description: "font-semibold",
                      input: "placeholder:!text-foreground",
                    }}
                    value={filters.minTotal === null || filters.minTotal === undefined || filters.minTotal === ""
                      ? null
                      : Number(filters.minTotal)}
                    onValueChange={(value) => updateFilter("minTotal", value ?? null)}
                  />

                  <NumberInput
                    label={t("filter.maxTotalLabel")}
                    placeholder={t("filter.totalPlaceholder")}
                    classNames={{
                      inputWrapper: "shadow-none",
                      input: "placeholder:!text-foreground",
                    }}
                    value={filters.maxTotal === null || filters.maxTotal === undefined || filters.maxTotal === ""
                      ? null
                      : Number(filters.maxTotal)}
                    onValueChange={(value) => updateFilter("maxTotal", value ?? null)}
                  />

                  <Select
                    aria-label="Sort by"
                    label={t("filter.sortByLabel")}
                    selectedKeys={filters.sortBy ? [filters.sortBy] : []}
                    onSelectionChange={(keys) => updateFilter("sortBy", Array.from(keys)[0] || null)}
                  >
                    <SelectItem key="date" value="date">{t("filter.sortByDate")}</SelectItem>
                    <SelectItem key="total" value="total">{t("filter.sortByTotal")}</SelectItem>
                  </Select>

                  <Select
                    aria-label="Sort order"
                    label={t("filter.sortOrderLabel")}
                    selectedKeys={filters.sortOrder ? [filters.sortOrder] : []}
                    onSelectionChange={(keys) => updateFilter("sortOrder", Array.from(keys)[0] || null)}
                  >
                    <SelectItem key="asc" value="asc">{t("filter.sortOrderAsc")}</SelectItem>
                    <SelectItem key="desc" value="desc">{t("filter.sortOrderDesc")}</SelectItem>
                  </Select>
                </div>

                <div className="flex flex-col md:flex-row gap-3 justify-end">
                  <Button
                    variant="bordered"
                    type="button"
                    className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onPress={onClearFilters}
                  >
                    {t("filter.clear")}
                  </Button>
                  <Button color="primary" onPress={onApplyFilters}>
                    {t("filter.apply")}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
