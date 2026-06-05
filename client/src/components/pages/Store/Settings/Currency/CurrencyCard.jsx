"use client";

import { Card, CardBody, CardHeader, Autocomplete, AutocompleteItem } from "@heroui/react";
import { useTranslations } from "next-intl";

export function CurrencyCard({ selectedCurrency, currencies, onCurrencyChange }) {
  const settingsTranslations = useTranslations("settings");

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {settingsTranslations("cardCurrency.title")}
        </h2>
      </CardHeader>
      <CardBody>
        <Autocomplete
          className="w-full sm:max-w-xs"
          size="sm"
          label={settingsTranslations("cardCurrency.currencyLabel")}
          selectedKey={selectedCurrency}
          onSelectionChange={onCurrencyChange}
          allowsCustomValue={false}
          isClearable
          menuTrigger="focus"
          inputProps={{
            onClick: (e) => e.target.select(),
          }}
          defaultFilter={(textValue, inputValue) => textValue.toLowerCase().startsWith(inputValue.toLowerCase())}
        >
          {currencies.map((c) => (
            <AutocompleteItem key={c.code} textValue={`${c.code} - ${c.name}`}>
              {`${c.code}  -  ${c.name}`}
            </AutocompleteItem>
          ))}
        </Autocomplete>
      </CardBody>
    </Card>
  );
}
