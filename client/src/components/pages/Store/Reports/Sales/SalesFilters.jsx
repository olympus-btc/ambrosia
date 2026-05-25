"use client";
import { Input, Select, SelectItem } from "@heroui/react";
import { Banknote, Bitcoin, CreditCard, Search } from "lucide-react";
import { useTranslations } from "next-intl";

const PAYMENT_OPTIONS = [
  { value: "all", localeKey: "all", icon: <Search className="w-4 h-4" /> },
  { value: "Cash", localeKey: "cash", icon: <Banknote className="w-4 h-4" /> },
  { value: "BTC", localeKey: "btc", icon: <Bitcoin className="w-4 h-4" /> },
  { value: "Debit Card", localeKey: "debitCard", icon: <CreditCard className="w-4 h-4" /> },
  { value: "Credit Card", localeKey: "creditCard", icon: <CreditCard className="w-4 h-4" /> },
];

export function SalesFilters({ filters, onFiltersChange, disabled }) {
  const t = useTranslations("reports");

  const handlePaymentMethod = (keys) => {
    const selected = Array.from(keys)[0] ?? "all";
    onFiltersChange({ paymentMethod: selected === "all" ? "" : selected });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Input
        isClearable
        className="flex-1"
        label={t("filters.productName")}
        aria-label={t("filters.productName")}
        placeholder={t("filters.productNamePlaceholder")}
        value={filters.productName}
        onChange={(e) => onFiltersChange({ productName: e.target.value })}
        onClear={() => onFiltersChange({ productName: "" })}
        isDisabled={disabled}
      />
      <Select
        aria-label={t("filters.paymentMethod")}
        label={t("filters.paymentMethod")}
        className="sm:w-48 shrink-0"
        selectedKeys={new Set([filters.paymentMethod || "all"])}
        onSelectionChange={handlePaymentMethod}
        isDisabled={disabled}
      >
        {PAYMENT_OPTIONS.map(({ value, localeKey, icon }) => (
          <SelectItem key={value} value={value} startContent={icon}>
            {t(`filters.paymentMethods.${localeKey}`)}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}
