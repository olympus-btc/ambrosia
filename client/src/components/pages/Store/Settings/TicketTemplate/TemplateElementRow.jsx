"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Input, Select, SelectItem, Tooltip } from "@heroui/react";
import { Bold, ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";

import { TemplateVariablePicker } from "./TemplateVariablePicker";
import { resolveValue } from "./useTicketTemplatePreviewElements";

const VARIABLE_PICKER_TYPES = ["HEADER", "TEXT", "FOOTER"];

const ELEMENT_TYPES = [
  "HEADER",
  "TEXT",
  "LINE_BREAK",
  "SEPARATOR",
  "TABLE_HEADER",
  "TABLE_ROW",
  "FOOTER",
  "QRCODE",
];

const JUSTIFICATIONS = ["LEFT", "CENTER", "RIGHT"];
const FONT_SIZES = ["NORMAL", "LARGE", "EXTRA_LARGE"];

export function TemplateElementRow({ element, isOpen, onToggle, onChange, onRemove, config, t }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: element.localId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const type = element.type;
  const showValue = ["HEADER", "TEXT", "FOOTER", "TABLE_HEADER", "QRCODE"].includes(type);
  const showVariablePicker = VARIABLE_PICKER_TYPES.includes(type);
  const showStyle = type !== "LINE_BREAK" && type !== "SEPARATOR";
  const showBold = showStyle && type !== "QRCODE";
  const showJustification = showStyle;
  const showFontSize = showStyle;

  const handleChange = (updates) => onChange({ ...element, ...updates });

  const selectVariable = (variable) => handleChange({ value: variable });

  const typeLabel = t(`templates.elementTypes.${type}`);
  const resolvedSummary = resolveValue(element.value ?? "", config);
  const valueSummary = resolvedSummary ? `— "${resolvedSummary}"` : "";

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        onClick={onToggle}
      >
        <span
          className="cursor-grab text-gray-400 hover:text-gray-600 shrink-0"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </span>

        <span className="text-sm font-medium text-green-900 shrink-0">{typeLabel}</span>
        {!isOpen && valueSummary && (
          <span className="text-xs text-gray-400 truncate">{valueSummary}</span>
        )}

        <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={onToggle}
            aria-label={isOpen ? t("templates.collapse") : t("templates.expand")}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            color="danger"
            onPress={() => onRemove(element.localId)}
            aria-label={t("templates.removeElement")}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-3">
          <div className="mb-3">
            <Select
              label={t("templates.elementTypeLabel")}
              selectedKeys={element.type ? [element.type] : []}
              onChange={(e) => handleChange({ type: e.target.value })}
            >
              {ELEMENT_TYPES.map((typeOption) => (
                <SelectItem key={typeOption} value={typeOption}>
                  {t(`templates.elementTypes.${typeOption}`)}
                </SelectItem>
              ))}
            </Select>
          </div>

          {(showValue || showStyle) && (
            <div className="grid gap-3 lg:grid-cols-[1.2fr_160px_160px_auto] lg:items-end">
              {showValue && (
                <Input
                  label={t("templates.elementValueLabel")}
                  value={element.value ?? ""}
                  onChange={(e) => handleChange({ value: e.target.value })}
                  endContent={showVariablePicker ? (
                    <Tooltip
                      showArrow
                      placement="right"
                      size="sm"
                      content={t("templates.variables.tooltip")}
                      classNames={{ base: "before:rounded-none before:shadow-none shadow-none", content: "rounded-md border-none shadow-none" }}
                    >
                      <div>
                        <TemplateVariablePicker onSelect={selectVariable} t={t} />
                      </div>
                    </Tooltip>
                  ) : null}
                />
              )}

              {showJustification && (
                <Select
                  label={t("templates.justificationLabel")}
                  selectedKeys={element.style?.justification ? [element.style.justification] : []}
                  onChange={(e) => handleChange({
                    style: { ...element.style, justification: e.target.value },
                  })}
                >
                  {JUSTIFICATIONS.map((justification) => (
                    <SelectItem key={justification} value={justification}>
                      {t(`templates.justifications.${justification}`)}
                    </SelectItem>
                  ))}
                </Select>
              )}

              {showFontSize && (
                <Select
                  label={t("templates.fontSizeLabel")}
                  selectedKeys={element.style?.fontSize ? [element.style.fontSize] : []}
                  onChange={(e) => handleChange({
                    style: { ...element.style, fontSize: e.target.value },
                  })}
                >
                  {FONT_SIZES.map((fontSize) => (
                    <SelectItem key={fontSize} value={fontSize}>
                      {t(`templates.fontSizes.${fontSize}`)}
                    </SelectItem>
                  ))}
                </Select>
              )}

              {showBold && (
                <Button
                  isIconOnly
                  size="sm"
                  variant={element.style?.bold ? "solid" : "bordered"}
                  color={element.style?.bold ? "primary" : "default"}
                  onPress={() => handleChange({
                    style: { ...element.style, bold: !element.style?.bold },
                  })}
                  aria-label={t("templates.boldToggle")}
                >
                  <Bold className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
