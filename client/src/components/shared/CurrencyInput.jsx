"use client";

import { Autocomplete, AutocompleteItem } from "@heroui/react";

export function currencySearchFilter(textValue, inputValue) {
  return textValue.toLowerCase().includes(inputValue.toLowerCase());
}

export function CurrencyInput({
  currencies,
  label,
  onSelectionChange,
  selectedKey,
  defaultSelectedKey,
  className,
  size,
  isInvalid,
  errorMessage,
}) {
  return (
    <Autocomplete
      className={className}
      size={size}
      label={label}
      selectedKey={selectedKey}
      defaultSelectedKey={defaultSelectedKey}
      onSelectionChange={onSelectionChange}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      isClearable
      allowsCustomValue={false}
      menuTrigger="focus"
      inputProps={{
        onClick: (event) => event.target.select(),
      }}
      defaultFilter={currencySearchFilter}
    >
      {currencies.map((currency) => (
        <AutocompleteItem key={currency.code} textValue={`${currency.code} - ${currency.name}`}>
          {`${currency.code}  -  ${currency.name}`}
        </AutocompleteItem>
      ))}
    </Autocomplete>
  );
}
