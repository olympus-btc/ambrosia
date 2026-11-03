"use client";

import { Input, Select, SelectItem } from "@heroui/react";

import { DATE_FORMATS, TICKET_TYPES, TIME_FORMATS } from "./defaults";
import { TemplateElementsEditor } from "./ElementsEditor";

export function TicketTemplatesEditor({
  templateName,
  onTemplateNameChange,
  ticketType,
  onTicketTypeChange,
  isTicketTypeLocked,
  printFormats,
  onPrintFormatsChange,
  templateElements,
  onElementChange,
  onElementAdd,
  onElementReorder,
  onElementRemove,
  config,
  settingsTranslations,
}) {
  return (
    <div className="flex min-w-0 flex-2 flex-col gap-4">
      <Input
        label={settingsTranslations("templates.nameLabel")}
        value={templateName}
        onChange={onTemplateNameChange}
      />

      <Select
        label={settingsTranslations("templates.ticketTypeLabel")}
        selectedKeys={[ticketType]}
        isDisabled={isTicketTypeLocked}
        onChange={(ticketTypeChangeEvent) => {
          if (ticketTypeChangeEvent.target.value) onTicketTypeChange(ticketTypeChangeEvent.target.value);
        }}
      >
        {TICKET_TYPES.map((ticketTypeOption) => (
          <SelectItem key={ticketTypeOption} value={ticketTypeOption}>
            {settingsTranslations(`templates.ticketTypes.${ticketTypeOption}`)}
          </SelectItem>
        ))}
      </Select>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label={settingsTranslations("templates.dateFormatLabel")}
          selectedKeys={[printFormats.dateFormat]}
          onChange={(dateFormatChangeEvent) => {
            if (dateFormatChangeEvent.target.value) onPrintFormatsChange({ ...printFormats, dateFormat: dateFormatChangeEvent.target.value });
          }}
        >
          {DATE_FORMATS.map((dateFormat) => (
            <SelectItem key={dateFormat} value={dateFormat}>
              {settingsTranslations(`templates.dateFormats.${dateFormat}`)}
            </SelectItem>
          ))}
        </Select>

        <Select
          label={settingsTranslations("templates.timeFormatLabel")}
          selectedKeys={[printFormats.timeFormat]}
          onChange={(timeFormatChangeEvent) => {
            if (timeFormatChangeEvent.target.value) onPrintFormatsChange({ ...printFormats, timeFormat: timeFormatChangeEvent.target.value });
          }}
        >
          {TIME_FORMATS.map((timeFormat) => (
            <SelectItem key={timeFormat} value={timeFormat}>
              {settingsTranslations(`templates.timeFormats.${timeFormat}`)}
            </SelectItem>
          ))}
        </Select>
      </div>

      <TemplateElementsEditor
        templateElements={templateElements}
        ticketType={ticketType}
        onChange={onElementChange}
        onAdd={onElementAdd}
        onReorder={onElementReorder}
        onRemove={onElementRemove}
        config={config}
        printFormats={printFormats}
        settingsTranslations={settingsTranslations}
      />
    </div>
  );
}
