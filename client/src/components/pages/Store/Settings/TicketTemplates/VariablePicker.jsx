"use client";

import { Button, Chip, Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { Braces, Check } from "lucide-react";

const VARIABLE_GROUPS = [
  {
    group: "config",
    variables: [
      { key: "{{config.businessName}}", label: "businessName" },
      { key: "{{config.businessAddress}}", label: "businessAddress" },
      { key: "{{config.businessPhone}}", label: "businessPhone" },
      { key: "{{config.businessEmail}}", label: "businessEmail" },
    ],
  },
  {
    group: "print",
    variables: [
      { key: "{{print.date}}", label: "printDate" },
      { key: "{{print.time}}", label: "printTime" },
      { key: "{{print.dateTime}}", label: "printDateTime" },
    ],
  },
  {
    group: "shift",
    ticketType: "SHIFT_CLOSE",
    variables: [
      { key: "{{shift.cashier}}", label: "cashier" },
      { key: "{{shift.openedAt}}", label: "openedAt" },
      { key: "{{shift.closedAt}}", label: "closedAt" },
      { key: "{{shift.totalTickets}}", label: "totalTickets" },
      { key: "{{shift.totalSales}}", label: "totalSales" },
      { key: "{{shift.totalTips}}", label: "totalTips" },
      { key: "{{shift.initialAmount}}", label: "initialAmount" },
      { key: "{{shift.cashSales}}", label: "cashSales" },
      { key: "{{shift.cashRefunds}}", label: "cashRefunds" },
      { key: "{{shift.expectedCash}}", label: "expectedCash" },
      { key: "{{shift.countedCash}}", label: "countedCash" },
      { key: "{{shift.difference}}", label: "difference" },
    ],
  },
];

export function TemplateVariablePicker({ templateText = "", ticketType, onSelect, onDeselect, settingsTranslations }) {
  const availableVariableGroups = VARIABLE_GROUPS.filter(
    (variableGroup) => !variableGroup.ticketType || variableGroup.ticketType === ticketType,
  );

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className="text-gray-400 hover:text-primary-500"
          aria-label={settingsTranslations("templates.variables.title")}
        >
          <Braces className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-3 w-60">
        {availableVariableGroups.map(({ group, variables }) => (
          <div key={group} className="mb-3 w-full last:mb-0">
            <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {settingsTranslations(`templates.variables.groups.${group}`)}
            </p>
            <div className="flex flex-wrap gap-1">
              {variables.map(({ key, label }) => {
                const isSelected = templateText.includes(key);
                return (
                  <Chip
                    key={key}
                    size="sm"
                    variant="flat"
                    color="primary"
                    role="button"
                    aria-pressed={isSelected}
                    startContent={isSelected ? <Check className="w-3 h-3" /> : null}
                    className={isSelected
                      ? "cursor-pointer bg-green-800 text-xs text-white border border-green-800"
                      : "cursor-pointer bg-green-200 text-xs text-green-800 border border-green-300"}
                    onClick={() => (isSelected ? onDeselect(key) : onSelect(key))}
                  >
                    {settingsTranslations(`templates.variables.${label}`)}
                  </Chip>
                );
              })}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
