"use client";
import { Input, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

export function OrdersFilters({ search, onSearchChange, paymentMethod, onPaymentMethodChange, disabled, orders = [] }) {
  const reportsTranslations = useTranslations("reports");

  const paymentMethods = ["all", ...new Set(orders.map((order) => order.paymentMethod).filter(Boolean))];

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Input
        isClearable
        className="flex-1"
        label={reportsTranslations("filters.search")}
        aria-label={reportsTranslations("filters.search")}
        placeholder={reportsTranslations("filters.productNamePlaceholder")}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onClear={() => onSearchChange("")}
        isDisabled={disabled}
      />
      <Select
        aria-label={reportsTranslations("filters.paymentMethod")}
        label={reportsTranslations("filters.paymentMethod")}
        className="sm:w-48 shrink-0"
        selectedKeys={new Set([paymentMethod || "all"])}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] ?? "all";
          onPaymentMethodChange(selected === "all" ? "" : selected);
        }}
        isDisabled={disabled}
      >
        {paymentMethods.map((method) => (
          <SelectItem key={method} value={method}>
            {method === "all" ? reportsTranslations("filters.paymentMethods.all") : method}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}
