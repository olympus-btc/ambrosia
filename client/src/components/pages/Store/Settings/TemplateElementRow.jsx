"use client";

import { Button, Input, Select, SelectItem } from "@heroui/react";

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

export function TemplateElementRow({ element, onChange, onMove, onRemove, t }) {
  const type = element.type;
  const showValue = ["HEADER", "TEXT", "FOOTER", "TABLE_HEADER", "SEPARATOR", "QRCODE"].includes(type);
  const showStyle = type !== "LINE_BREAK" && type !== "SEPARATOR";
  const showBold = showStyle && type !== "QRCODE";
  const showJustification = showStyle;
  const showFontSize = showStyle;

  const handleChange = (updates) => onChange({ ...element, ...updates });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          className="min-w-48"
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

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="bordered" onPress={() => onMove(element.localId, -1)}>
            {t("templates.moveUp")}
          </Button>
          <Button size="sm" variant="bordered" onPress={() => onMove(element.localId, 1)}>
            {t("templates.moveDown")}
          </Button>
          <Button size="sm" color="danger" variant="bordered" onPress={() => onRemove(element.localId)}>
            {t("templates.removeElement")}
          </Button>
        </div>
      </div>

      {(showValue || showStyle) && (
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_160px_160px_auto] lg:items-end">
          {showValue && (
            <Input
              label={t("templates.elementValueLabel")}
              value={element.value ?? ""}
              onChange={(e) => handleChange({ value: e.target.value })}
            />
          )}

          {showJustification && (
            <Select
              label={t("templates.justificationLabel")}
              selectedKeys={element.style?.justification ? [element.style.justification] : []}
              onChange={(e) => handleChange({
                style: { ...element.style, justification: e.target.value },
              })
              }
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
              })
              }
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
              size="sm"
              variant={element.style?.bold ? "solid" : "bordered"}
              onPress={() => handleChange({
                style: { ...element.style, bold: !element.style?.bold },
              })
              }
            >
              {element.style?.bold ? t("templates.boldOn") : t("templates.boldOff")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
