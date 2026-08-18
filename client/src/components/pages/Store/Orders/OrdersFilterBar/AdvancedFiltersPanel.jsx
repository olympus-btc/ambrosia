"use client";

import { Button, DateRangePicker, NumberInput, Select, SelectItem } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { useTranslations } from "next-intl";

const ORDER_STATUSES = ["open", "closed", "paid", "refunded"];

export function AdvancedFiltersPanel({ filters, paymentMethods, onFiltersChange, onApplyFilters, onClearFilters }) {
  const ordersTranslations = useTranslations("orders");
  const statusTranslations = useTranslations("status");

  const updateFilter = (key, value) => {
    onFiltersChange({ [key]: value === "" ? null : value });
  };

  const dateRangeValue = filters.startDate && filters.endDate
    ? { start: parseDate(filters.startDate), end: parseDate(filters.endDate) }
    : null;

  const handleDateRangeChange = (range) => {
    onFiltersChange({
      startDate: range?.start?.toString() ?? null,
      endDate: range?.end?.toString() ?? null,
    });
  };

  return (
    <div className="border border-default-200 rounded-xl p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-green-900">{ordersTranslations("filter.advancedTitle")}</p>
        <p className="text-xs text-default-500">{ordersTranslations("filter.advancedSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Select
          aria-label="Status"
          label={ordersTranslations("filter.statusLabel")}
          selectedKeys={[filters.status ?? "__all__"]}
          onSelectionChange={(keys) => {
            const nextValue = Array.from(keys)[0];
            updateFilter("status", nextValue === "__all__" ? null : nextValue || null);
          }}
        >
          <SelectItem key="__all__" value="">
            {ordersTranslations("filter.allStatuses")}
          </SelectItem>
          {ORDER_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {statusTranslations(status)}
            </SelectItem>
          ))}
        </Select>

        <Select
          aria-label="Payment method"
          label={ordersTranslations("filter.paymentMethodLabel")}
          selectedKeys={[filters.paymentMethod ?? "__all__"]}
          onSelectionChange={(keys) => {
            const nextValue = Array.from(keys)[0];
            updateFilter("paymentMethod", nextValue === "__all__" ? null : nextValue || null);
          }}
        >
          <SelectItem key="__all__" value="">
            {ordersTranslations("filter.allPaymentMethods")}
          </SelectItem>
          {paymentMethods.map((method) => (
            <SelectItem key={method.name} value={method.name}>
              {method.name}
            </SelectItem>
          ))}
        </Select>

        <DateRangePicker
          aria-label={ordersTranslations("filter.dateRangeLabel")}
          className="sm:col-span-2"
          label={ordersTranslations("filter.dateRangeLabel")}
          value={dateRangeValue}
          onChange={handleDateRangeChange}
        />

        <NumberInput
          aria-label={ordersTranslations("filter.minTotalLabel")}
          label={ordersTranslations("filter.minTotalLabel")}
          placeholder={ordersTranslations("filter.totalPlaceholder")}
          variant="flat"
          classNames={{
            inputWrapper: "shadow-none",
            description: "font-semibold",
            input: "placeholder:!text-foreground",
          }}
          value={filters.minTotal == null || filters.minTotal === "" ? null : Number(filters.minTotal)}
          onValueChange={(value) => updateFilter("minTotal", value ?? null)}
        />

        <NumberInput
          aria-label={ordersTranslations("filter.maxTotalLabel")}
          label={ordersTranslations("filter.maxTotalLabel")}
          placeholder={ordersTranslations("filter.totalPlaceholder")}
          classNames={{
            inputWrapper: "shadow-none",
            input: "placeholder:!text-foreground",
          }}
          value={filters.maxTotal == null || filters.maxTotal === "" ? null : Number(filters.maxTotal)}
          onValueChange={(value) => updateFilter("maxTotal", value ?? null)}
        />

        <Select
          aria-label="Sort by"
          label={ordersTranslations("filter.sortByLabel")}
          selectedKeys={filters.sortBy ? [filters.sortBy] : []}
          onSelectionChange={(keys) => updateFilter("sortBy", Array.from(keys)[0] || null)}
        >
          <SelectItem key="date" value="date">{ordersTranslations("filter.sortByDate")}</SelectItem>
          <SelectItem key="total" value="total">{ordersTranslations("filter.sortByTotal")}</SelectItem>
        </Select>

        <Select
          aria-label="Sort order"
          label={ordersTranslations("filter.sortOrderLabel")}
          selectedKeys={filters.sortOrder ? [filters.sortOrder] : []}
          onSelectionChange={(keys) => updateFilter("sortOrder", Array.from(keys)[0] || null)}
        >
          <SelectItem key="asc" value="asc">{ordersTranslations("filter.sortOrderAsc")}</SelectItem>
          <SelectItem key="desc" value="desc">{ordersTranslations("filter.sortOrderDesc")}</SelectItem>
        </Select>
      </div>

      <div className="flex flex-row gap-3 justify-between md:justify-end">
        <Button
          variant="bordered"
          type="button"
          className="px-6 py-2 border border-border text-foreground hover:bg-muted transition-colors"
          onPress={onClearFilters}
        >
          {ordersTranslations("filter.clear")}
        </Button>
        <Button color="primary" className="bg-green-800" onPress={onApplyFilters}>
          {ordersTranslations("filter.apply")}
        </Button>
      </div>
    </div>
  );
}
