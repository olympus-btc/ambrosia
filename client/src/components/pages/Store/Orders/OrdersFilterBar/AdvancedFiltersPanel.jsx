"use client";

import { Button, Input, NumberInput, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

export function AdvancedFiltersPanel({ filters, paymentMethods, onFiltersChange, onApplyFilters, onClearFilters }) {
  const t = useTranslations("orders");

  const updateFilter = (key, value) => {
    onFiltersChange({ [key]: value === "" ? null : value });
  };

  return (
    <div className="border border-default-200 rounded-xl p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-green-900">{t("filter.advancedTitle")}</p>
        <p className="text-xs text-default-500">{t("filter.advancedSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
          value={filters.minTotal == null || filters.minTotal === "" ? null : Number(filters.minTotal)}
          onValueChange={(value) => updateFilter("minTotal", value ?? null)}
        />

        <NumberInput
          label={t("filter.maxTotalLabel")}
          placeholder={t("filter.totalPlaceholder")}
          classNames={{
            inputWrapper: "shadow-none",
            input: "placeholder:!text-foreground",
          }}
          value={filters.maxTotal == null || filters.maxTotal === "" ? null : Number(filters.maxTotal)}
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

      <div className="flex flex-row gap-3 justify-between md:justify-end">
        <Button
          variant="bordered"
          type="button"
          className="px-6 py-2 border border-border text-foreground hover:bg-muted transition-colors"
          onPress={onClearFilters}
        >
          {t("filter.clear")}
        </Button>
        <Button color="primary" className="bg-green-800" onPress={onApplyFilters}>
          {t("filter.apply")}
        </Button>
      </div>
    </div>
  );
}
