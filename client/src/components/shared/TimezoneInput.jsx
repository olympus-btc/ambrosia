"use client";

import { Autocomplete, AutocompleteItem } from "@heroui/react";

export function timezoneSearchFilter(textValue, inputValue) {
  return textValue.toLowerCase().includes(inputValue.toLowerCase());
}

export function TimezoneInput({
  timezones,
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
      defaultFilter={timezoneSearchFilter}
    >
      {timezones.map((timezone) => (
        <AutocompleteItem key={timezone.zoneId} textValue={timezone.label}>
          {timezone.label}
        </AutocompleteItem>
      ))}
    </Autocomplete>
  );
}
