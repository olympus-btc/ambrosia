"use client";

import { Button, Chip, Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { Braces } from "lucide-react";

const VARIABLE_GROUPS = [
  {
    group: "config",
    vars: [
      { key: "{{config.businessName}}", label: "businessName" },
      { key: "{{config.businessAddress}}", label: "businessAddress" },
      { key: "{{config.businessPhone}}", label: "businessPhone" },
      { key: "{{config.businessEmail}}", label: "businessEmail" },
    ],
  },
  {
    group: "ticket",
    vars: [
      { key: "{{ticket.id}}", label: "ticketId" },
      { key: "{{ticket.tableName}}", label: "tableName" },
      { key: "{{ticket.roomName}}", label: "roomName" },
      { key: "{{ticket.date}}", label: "date" },
      { key: "{{ticket.total}}", label: "total" },
      { key: "{{ticket.invoice}}", label: "invoice" },
    ],
  },
];

const VISIBLE_GROUPS = ["config"];

export function TemplateVariablePicker({ onSelect, t }) {
  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className="text-gray-400 hover:text-primary-500"
          aria-label={t("templates.variables.title")}
        >
          <Braces className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-3 w-60">
        <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {t("templates.variables.title")}
        </p>
        {VARIABLE_GROUPS.filter(({ group }) => VISIBLE_GROUPS.includes(group)).map(({ group, vars }) => (
          <div key={group} className="mb-3 last:mb-0">
            <div className="flex flex-wrap gap-1">
              {vars.map(({ key, label }) => (
                <Chip
                  key={key}
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="cursor-pointer bg-green-200 text-xs text-green-800 border border-green-300"
                  onClick={() => onSelect(key)}
                >
                  {t(`templates.variables.${label}`)}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
