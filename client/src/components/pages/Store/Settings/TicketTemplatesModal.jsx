"use client";

import { useMemo, useState } from "react";
import {
  addToast,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@heroui/react";
import { useTranslations } from "next-intl";
import { usePrinters } from "../hooks/usePrinter";
import { useTemplates } from "../hooks/useTemplates";

const ELEMENT_TYPES = [
  "HEADER",
  "TEXT",
  "LINE_BREAK",
  "SEPARATOR",
  "TABLE_HEADER",
  "TABLE_ROW",
  "FOOTER",
];

const JUSTIFICATIONS = ["LEFT", "CENTER", "RIGHT"];
const FONT_SIZES = ["NORMAL", "LARGE", "EXTRA_LARGE"];
const PRINTER_TYPES = ["KITCHEN", "CUSTOMER", "BAR"];
const sampleTicket = {
  ticketId: "123",
  tableName: "Mesa 4",
  roomName: "Salon",
  date: "2024-01-10 19:30",
  items: [
    { quantity: 2, name: "Tacos al pastor", price: 90, comments: ["sin cebolla"] },
    { quantity: 1, name: "Agua fresca", price: 35, comments: [] },
  ],
  total: 215,
};

const sampleConfig = {
  businessName: "Ambrosia",
  businessAddress: "Calle Principal 123",
  businessPhone: "+52 555 1234567",
};

const fontSizeClasses = {
  NORMAL: "text-sm",
  LARGE: "text-base",
  EXTRA_LARGE: "text-lg",
};

function resolveValue(value) {
  if (!value) return "";
  return value
    .replaceAll("{{config.businessName}}", sampleConfig.businessName)
    .replaceAll("{{config.businessAddress}}", sampleConfig.businessAddress)
    .replaceAll("{{config.businessPhone}}", sampleConfig.businessPhone)
    .replaceAll("{{ticket.id}}", sampleTicket.ticketId)
    .replaceAll("{{ticket.tableName}}", sampleTicket.tableName)
    .replaceAll("{{ticket.roomName}}", sampleTicket.roomName)
    .replaceAll("{{ticket.date}}", sampleTicket.date)
    .replaceAll("{{ticket.total}}", sampleTicket.total.toString());
}

function resolveAlignment(justification) {
  if (justification === "CENTER") return "text-center";
  if (justification === "RIGHT") return "text-right";
  return "text-left";
}

function createElement() {
  return {
    localId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "TEXT",
    value: "",
    style: {
      bold: false,
      justification: "LEFT",
      fontSize: "NORMAL",
    },
  };
}

function TemplateElementRow({ element, onChange, onRemove, onMove, t }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-gray-200 p-3">
      <Select
        className="min-w-40 max-w-48"
        label={t("templates.elementTypeLabel")}
        selectedKeys={element.type ? [element.type] : []}
        onChange={(e) => onChange({ ...element, type: e.target.value })}
      >
        {ELEMENT_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {t(`templates.elementTypes.${type}`)}
          </SelectItem>
        ))}
      </Select>
      <Input
        className="min-w-64 flex-1"
        label={t("templates.elementValueLabel")}
        value={element.value ?? ""}
        onChange={(e) => onChange({ ...element, value: e.target.value })}
      />
      <Select
        className="min-w-36 max-w-40"
        label={t("templates.justificationLabel")}
        selectedKeys={element.style?.justification ? [element.style.justification] : []}
        onChange={(e) =>
          onChange({
            ...element,
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
      <Select
        className="min-w-36 max-w-40"
        label={t("templates.fontSizeLabel")}
        selectedKeys={element.style?.fontSize ? [element.style.fontSize] : []}
        onChange={(e) =>
          onChange({
            ...element,
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
      <Button
        variant={element.style?.bold ? "solid" : "bordered"}
        onPress={() =>
          onChange({
            ...element,
            style: { ...element.style, bold: !element.style?.bold },
          })
        }
      >
        {element.style?.bold ? t("templates.boldOn") : t("templates.boldOff")}
      </Button>
      <Button variant="bordered" onPress={() => onMove(element.localId, -1)}>
        {t("templates.moveUp")}
      </Button>
      <Button variant="bordered" onPress={() => onMove(element.localId, 1)}>
        {t("templates.moveDown")}
      </Button>
      <Button color="danger" variant="bordered" onPress={() => onRemove(element.localId)}>
        {t("templates.removeElement")}
      </Button>
    </div>
  );
}

export function TicketTemplatesModal({ isOpen, onClose }) {
  const t = useTranslations("settings");
  const {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useTemplates();
  const { printTicket } = usePrinters();

  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [elements, setElements] = useState([createElement()]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printerType, setPrinterType] = useState("KITCHEN");

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId),
    [templates, selectedId],
  );

  const previewElements = useMemo(() => {
    if (!Array.isArray(elements)) return [];
    const output = [];
    elements.forEach((element) => {
      const style = element.style || {
        bold: false,
        justification: "LEFT",
        fontSize: "NORMAL",
      };
      const commonProps = {
        key: element.localId,
        className: `${resolveAlignment(style.justification)} ${
          fontSizeClasses[style.fontSize] || fontSizeClasses.NORMAL
        } ${style.bold ? "font-semibold" : "font-normal"}`,
      };
      if (element.type === "SEPARATOR") {
        output.push(
          <div key={`${element.localId}-sep`} className="border-t border-dashed border-gray-400 my-2" />,
        );
        return;
      }
      if (element.type === "LINE_BREAK") {
        output.push(<div key={`${element.localId}-break`} className="h-3" />);
        return;
      }
      if (element.type === "TABLE_ROW") {
        sampleTicket.items.forEach((item, index) => {
          output.push(
            <div
              key={`${element.localId}-row-${index}`}
              className={`flex items-start justify-between gap-3 ${commonProps.className}`}
            >
              <span className="truncate">
                {`${item.quantity}x ${item.name}`}
              </span>
              <span className="whitespace-nowrap">
                {item.price}
              </span>
            </div>,
          );
          item.comments.forEach((comment, commentIndex) => {
            output.push(
              <div
                key={`${element.localId}-comment-${index}-${commentIndex}`}
                className={`ml-3 text-xs text-gray-600 ${commonProps.className}`}
              >
                {`- ${comment}`}
              </div>,
            );
          });
        });
        return;
      }
      output.push(
        <div key={element.localId} className={commonProps.className}>
          {resolveValue(element.value || "")}
        </div>,
      );
    });
    return output;
  }, [elements]);

  const resetForm = () => {
    setSelectedId("");
    setName("");
    setElements([createElement()]);
  };

  const moveElement = (id, direction) => {
    setElements((prev) => {
      const index = prev.findIndex((element) => element.localId === id);
      if (index === -1) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(index, 1);
      updated.splice(nextIndex, 0, moved);
      return updated;
    });
  };

  const loadTemplate = (template) => {
    if (!template) return;
    setSelectedId(template.id);
    setName(template.name);
    const mappedElements = (template.elements || []).map((element) => ({
      localId: element.id || `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: element.type,
      value: element.value,
      style: element.style || {
        bold: false,
        justification: "LEFT",
        fontSize: "NORMAL",
      },
    }));
    setElements(mappedElements.length ? mappedElements : [createElement()]);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      elements: elements.map((element) => ({
        type: element.type,
        value: element.value ?? "",
        style: element.style || {
          bold: false,
          justification: "LEFT",
          fontSize: "NORMAL",
        },
      })),
    };
    try {
      if (selectedId) {
        await updateTemplate(selectedId, payload);
      } else {
        const created = await createTemplate(payload);
        if (created?.id) {
          setSelectedId(created.id);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePrintTest = async () => {
    if (!name.trim()) return;
    setPrinting(true);
    try {
      await printTicket({
        templateName: name.trim(),
        ticketData: sampleTicket,
        printerType,
        broadcast: false,
      });
    } catch (err) {
      console.error("Error printing test ticket:", err);
      addToast({
        title: t("templates.printErrorTitle"),
        description: t("templates.printErrorDescription"),
        color: "danger",
      });
    } finally {
      setPrinting(false);
    }
  };

  const templateExists = useMemo(
    () => templates.some((template) => template.name === name.trim()),
    [templates, name],
  );

  const handleDelete = async () => {
    if (!selectedId) return;
    setDeleting(true);
    try {
      await deleteTemplate(selectedId);
      resetForm();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="full" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t("templates.title")}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex w-full flex-col gap-3 lg:w-1/3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-green-900">
                  {t("templates.listTitle")}
                </h3>
                <Button variant="bordered" onPress={resetForm}>
                  {t("templates.newTemplate")}
                </Button>
              </div>
              {loading && (
                <p className="text-sm text-gray-600">{t("templates.loading")}</p>
              )}
              {error && (
                <p className="text-sm text-red-600">{t("templates.error")}</p>
              )}
              {!loading && templates.length === 0 && (
                <p className="text-sm text-gray-600">{t("templates.empty")}</p>
              )}
              <div className="flex flex-col gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => loadTemplate(template)}
                    className={`rounded-md border px-3 py-2 text-left ${
                      selectedId === template.id
                        ? "border-green-600 bg-green-50 text-green-900"
                        : "border-gray-200 text-gray-700"
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start">
              <div className="flex min-w-0 flex-[2] flex-col gap-4">
                <Input
                  label={t("templates.nameLabel")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-green-900">
                    {t("templates.elementsTitle")}
                  </h3>
                  <Button variant="bordered" onPress={() => setElements((prev) => [...prev, createElement()])}>
                    {t("templates.addElement")}
                  </Button>
                </div>

                <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto pr-2">
                  {elements.map((element) => (
                    <TemplateElementRow
                      key={element.localId}
                      element={element}
                      onChange={(updated) =>
                        setElements((prev) =>
                          prev.map((el) => (el.localId === updated.localId ? updated : el)),
                        )
                      }
                    onRemove={(id) => setElements((prev) => prev.filter((el) => el.localId !== id))}
                    onMove={moveElement}
                    t={t}
                  />
                ))}
                </div>
              </div>

              <div className="w-full lg:flex-[1] lg:sticky lg:top-0">
                <h3 className="text-lg font-semibold text-green-900">
                  {t("templates.previewTitle")}
                </h3>
                <div className="mt-2 max-h-[50vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  {previewElements.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      {t("templates.previewEmpty")}
                    </p>
                  ) : (
                    <div className="font-mono text-gray-900">
                      {previewElements}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="flex justify-between">
          <div className="flex items-center gap-2">
            {selectedId && (
              <Button
                color="danger"
                variant="bordered"
                onPress={handleDelete}
                isDisabled={deleting}
              >
                {t("templates.deleteTemplate")}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select
              className="min-w-32 max-w-40"
              label={t("templates.printTypeLabel")}
              selectedKeys={printerType ? [printerType] : []}
              onChange={(e) => setPrinterType(e.target.value)}
            >
              {PRINTER_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`cardPrinters.types.${type}`)}
                </SelectItem>
              ))}
            </Select>
            <Button
              variant="bordered"
              onPress={handlePrintTest}
              isDisabled={!templateExists || printing}
            >
              {printing ? t("templates.printing") : t("templates.printTest")}
            </Button>
            <Button variant="bordered" onPress={onClose}>
              {t("templates.close")}
            </Button>
            <Button color="primary" onPress={handleSave} isDisabled={saving || !name.trim()}>
              {selectedId ? t("templates.saveChanges") : t("templates.saveNew")}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
