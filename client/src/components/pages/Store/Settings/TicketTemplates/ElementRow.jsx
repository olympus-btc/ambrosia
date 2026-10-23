"use client";

import { useRef } from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Input, Select, SelectItem, Tooltip } from "@heroui/react";
import { Bold, ChevronDown, ChevronUp, GripVertical } from "lucide-react";

import { DeleteButton } from "@components/shared/DeleteButton";

import { DEFAULT_TICKET_TYPE, ELEMENT_TYPES_BY_TICKET_TYPE } from "./defaults";
import { insertVariable } from "./insertVariable";
import { LogoImageSection, LogoSourceSelect } from "./LogoSource";
import { removeVariable } from "./removeVariable";
import { resolveTemplateVariables } from "./TicketElements";
import { useLogoSource } from "./useLogoSource";
import { TemplateVariablePicker } from "./VariablePicker";

const VARIABLE_PICKER_TYPES = ["HEADER", "TEXT", "FOOTER", "TOTAL_ROW", "PAYMENT_METHOD"];

const JUSTIFICATIONS = ["LEFT", "CENTER", "RIGHT"];
const FONT_SIZES = ["NORMAL", "LARGE", "EXTRA_LARGE"];

export function TemplateElementRow({ templateElement, ticketType = DEFAULT_TICKET_TYPE, isOpen, onToggle, onChange, onRemove, businessConfig, printFormats, settingsTranslations }) {
  const {
    attributes: dragHandleAttributes,
    listeners: dragHandleListeners,
    setNodeRef: setSortableNodeRef,
    transform: sortableTransform,
    transition: sortableTransition,
    isDragging,
  } = useSortable({
    id: templateElement.localId,
  });

  const sortableStyle = {
    transform: CSS.Transform.toString(sortableTransform),
    transition: sortableTransition,
    opacity: isDragging ? 0.5 : 1,
  };

  const templateElementType = templateElement.type;
  const showValue = ["HEADER", "TEXT", "FOOTER", "TABLE_HEADER", "TOTAL_ROW", "PAYMENT_METHOD", "QRCODE", "SHIFT_SUMMARY"].includes(templateElementType);
  const showVariablePicker = VARIABLE_PICKER_TYPES.includes(templateElementType);
  const showLogoSource = templateElementType === "LOGO";
  const showStyle = templateElementType !== "LINE_BREAK" && templateElementType !== "SEPARATOR";
  const showBold = showStyle && templateElementType !== "QRCODE" && templateElementType !== "LOGO";
  const showJustification = showStyle && templateElementType !== "PAYMENT_METHOD";
  const showFontSize = showStyle;

  const handleChange = (elementUpdates) => onChange({ ...templateElement, ...elementUpdates });

  const logoSourceState = useLogoSource(templateElement.value ?? "", (updatedTemplateText) => handleChange({ value: updatedTemplateText }));

  const resolveTypeChange = (selectedType) => {
    if (selectedType === "LOGO") return { type: selectedType, value: "" };
    if (selectedType === "PAYMENT_METHOD" && !templateElement.value?.trim()) {
      return { type: selectedType, value: settingsTranslations("templates.paymentMethodDefaultLabel") };
    }
    return { type: selectedType };
  };

  const cursorRangeRef = useRef(null);

  const rememberCursorRange = (event) => {
    cursorRangeRef.current = { start: event.target.selectionStart, end: event.target.selectionEnd };
  };

  const selectVariable = (variable) => {
    const { updatedTemplateText, cursorPosition } = insertVariable(templateElement.value ?? "", variable, cursorRangeRef.current);
    cursorRangeRef.current = { start: cursorPosition, end: cursorPosition };
    handleChange({ value: updatedTemplateText });
  };

  const deselectVariable = (variable) => {
    cursorRangeRef.current = null;
    handleChange({ value: removeVariable(templateElement.value ?? "", variable) });
  };

  const typeLabel = settingsTranslations(`templates.elementTypes.${templateElementType}`);
  const resolvedSummary = resolveTemplateVariables(templateElement.value ?? "", businessConfig, printFormats);
  const valueSummary = resolvedSummary ? `— "${resolvedSummary}"` : "";

  return (
    <div ref={setSortableNodeRef} style={sortableStyle} className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        onClick={onToggle}
      >
        <span
          className="cursor-grab text-gray-400 hover:text-gray-600 shrink-0"
          onClick={(event) => event.stopPropagation()}
          {...dragHandleAttributes}
          {...dragHandleListeners}
        >
          <GripVertical className="w-4 h-4" />
        </span>

        <span className="text-sm font-medium text-green-900 shrink-0">{typeLabel}</span>
        {!isOpen && valueSummary && (
          <span className="text-xs text-gray-400 truncate">{valueSummary}</span>
        )}

        <div className="ml-auto flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={onToggle}
            aria-label={isOpen ? settingsTranslations("templates.collapse") : settingsTranslations("templates.expand")}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <DeleteButton onPress={() => onRemove(templateElement.localId)}>
            <span className="hidden sm:inline">{settingsTranslations("templates.removeElement")}</span>
          </DeleteButton>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-3">
          <div className="mb-3">
            <Select
              label={settingsTranslations("templates.elementTypeLabel")}
              selectedKeys={templateElement.type ? [templateElement.type] : []}
              onChange={(event) => {
                const selectedType = event.target.value;
                if (!selectedType) return;
                handleChange(resolveTypeChange(selectedType));
              }}
            >
              {ELEMENT_TYPES_BY_TICKET_TYPE[ticketType].map((typeOption) => (
                <SelectItem key={typeOption} value={typeOption}>
                  {settingsTranslations(`templates.elementTypes.${typeOption}`)}
                </SelectItem>
              ))}
            </Select>
          </div>

          {(showValue || showStyle) && (
            <div className="grid gap-3 lg:grid-cols-[1.2fr_160px_160px_auto] lg:items-end">
              {showLogoSource && (
                <LogoSourceSelect
                  logoSource={logoSourceState.logoSource}
                  onLogoSourceChange={logoSourceState.selectLogoSource}
                  settingsTranslations={settingsTranslations}
                />
              )}

              {showValue && (
                <Input
                  label={settingsTranslations("templates.elementValueLabel")}
                  value={templateElement.value ?? ""}
                  onChange={(event) => handleChange({ value: event.target.value })}
                  onSelect={rememberCursorRange}
                  endContent={showVariablePicker ? (
                    <Tooltip
                      showArrow
                      placement="right"
                      size="sm"
                      content={settingsTranslations("templates.variables.tooltip")}
                      classNames={{ base: "before:rounded-none before:shadow-none shadow-none", content: "rounded-md border-none shadow-none" }}
                    >
                      <div>
                        <TemplateVariablePicker
                          templateText={templateElement.value ?? ""}
                          ticketType={ticketType}
                          onSelect={selectVariable}
                          onDeselect={deselectVariable}
                          settingsTranslations={settingsTranslations}
                        />
                      </div>
                    </Tooltip>
                  ) : null}
                />
              )}

              {showJustification && (
                <Select
                  label={settingsTranslations("templates.justificationLabel")}
                  selectedKeys={templateElement.style?.justification ? [templateElement.style.justification] : []}
                  onChange={(event) => handleChange({
                    style: { ...templateElement.style, justification: event.target.value },
                  })}
                >
                  {JUSTIFICATIONS.map((justification) => (
                    <SelectItem key={justification} value={justification}>
                      {settingsTranslations(`templates.justifications.${justification}`)}
                    </SelectItem>
                  ))}
                </Select>
              )}

              {showFontSize && (
                <Select
                  label={settingsTranslations("templates.fontSizeLabel")}
                  selectedKeys={templateElement.style?.fontSize ? [templateElement.style.fontSize] : []}
                  onChange={(event) => handleChange({
                    style: { ...templateElement.style, fontSize: event.target.value },
                  })}
                >
                  {FONT_SIZES.map((fontSize) => (
                    <SelectItem key={fontSize} value={fontSize}>
                      {settingsTranslations(`templates.fontSizes.${fontSize}`)}
                    </SelectItem>
                  ))}
                </Select>
              )}

              {showBold && (
                <Button
                  isIconOnly
                  size="sm"
                  variant={templateElement.style?.bold ? "solid" : "bordered"}
                  color={templateElement.style?.bold ? "primary" : "default"}
                  onPress={() => handleChange({
                    style: { ...templateElement.style, bold: !templateElement.style?.bold },
                  })}
                  aria-label={settingsTranslations("templates.boldToggle")}
                >
                  <Bold className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}

          {showLogoSource && (
            <LogoImageSection
              logoSource={logoSourceState.logoSource}
              templateText={templateElement.value ?? ""}
              businessConfig={businessConfig}
              onLogoImageChange={logoSourceState.changeLogoImage}
              isUploading={logoSourceState.isUploading}
              uploadErrorKey={logoSourceState.uploadErrorKey}
              uploaderResetKey={logoSourceState.uploaderResetKey}
              settingsTranslations={settingsTranslations}
            />
          )}
        </div>
      )}
    </div>
  );
}
