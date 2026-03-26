"use client";

import { Button, Input, Popover, PopoverContent, PopoverTrigger, Select, SelectItem } from "@heroui/react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
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
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          isClearable
          className="flex-1"
          label={t("filter.searchLabel")}
          placeholder={t("filter.searchPlaceholder")}
          startContent={<Search width={20} height={20} />}
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

        <Popover placement="bottom-end">
          <PopoverTrigger>
            <Button
              variant="flat"
              className="w-full md:w-auto md:min-w-56 justify-between border border-default-200 bg-default-50"
              startContent={<SlidersHorizontal className="w-4 h-4" />}
              endContent={<ChevronDown className="w-4 h-4" />}
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

                <Input
                  type="number"
                  label={t("filter.minTotalLabel")}
                  placeholder={t("filter.totalPlaceholder")}
                  value={filters.minTotal ?? ""}
                  onChange={(e) => updateFilter("minTotal", e.target.value)}
                />

                <Input
                  type="number"
                  label={t("filter.maxTotalLabel")}
                  placeholder={t("filter.totalPlaceholder")}
                  value={filters.maxTotal ?? ""}
                  onChange={(e) => updateFilter("maxTotal", e.target.value)}
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
                <Button variant="flat" onPress={onClearFilters}>
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
  );
}
