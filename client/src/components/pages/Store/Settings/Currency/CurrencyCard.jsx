"use client";

import { Card, CardBody, CardHeader, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";

export function CurrencyCard({ selectedCurrency, currencies, onCurrencyChange }) {
  const t = useTranslations("settings");

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {t("cardCurrency.title")}
        </h2>
      </CardHeader>
      <CardBody>
        <Select
          className="w-full sm:max-w-xs"
          size="sm"
          label={t("cardCurrency.currencyLabel")}
          selectedKeys={selectedCurrency ? [selectedCurrency] : []}
          onChange={onCurrencyChange}
        >
          {currencies.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {`${c.code}  -  ${c.name}`}
            </SelectItem>
          ))}
        </Select>
      </CardBody>
    </Card>
  );
}
