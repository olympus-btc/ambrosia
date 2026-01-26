"use client";

import { useEffect, useMemo, useState } from "react";

import { addToast, Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { usePrinters } from "../../hooks/usePrinter";
import { useTemplates } from "../../hooks/useTemplates";

import { TemplatePreview } from "./TemplatePreview";
import { createElement, DEFAULT_STYLE } from "./ticketTemplateDefaults";
import { sampleTicket } from "./ticketTemplateSampleData";
import { TicketTemplatesEditor } from "./TicketTemplatesEditor";
import { TicketTemplatesFooter } from "./TicketTemplatesFooter";
import { useTicketTemplatePreviewElements } from "./useTicketTemplatePreviewElements";

const PRINTER_TYPES = ["CUSTOMER"];

export function TicketTemplatesModal({ isOpen, onClose, initialTemplate = null }) {
  const t = useTranslations("settings");
  const {
    templates,
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
  const [printerType, setPrinterType] = useState("CUSTOMER");

  const previewElements = useTicketTemplatePreviewElements(elements);

  useEffect(() => {
    if (isOpen && initialTemplate) {
      setSelectedId(initialTemplate.id);
      setName(initialTemplate.name);
      const mappedElements = (initialTemplate.elements || []).map((element) => ({
        localId: element.id || `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: element.type,
        value: element.value,
        style: element.style || DEFAULT_STYLE,
      }));
      setElements(mappedElements.length ? mappedElements : [createElement()]);
    } else if (isOpen && !initialTemplate) {
      setSelectedId("");
      setName("");
      setElements([createElement()]);
    }
  }, [isOpen, initialTemplate]);

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

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      elements: elements.map((element) => ({
        type: element.type,
        value: element.value ?? "",
        style: element.style || DEFAULT_STYLE,
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
        forceTemplateName: true,
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
    <Modal
      className="min-h-[600px][@media(max-height:800px)]:max-h-[600px] overflow-y-auto"
      size="5xl"
      isOpen={isOpen}
      onOpenChange={onClose}
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader>{t("templates.title")}</ModalHeader>
        <ModalBody>
          <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start">
            <TicketTemplatesEditor
              name={name}
              onNameChange={(e) => setName(e.target.value)}
              elements={elements}
              onElementChange={(updated) => setElements((prev) => prev.map((el) => (el.localId === updated.localId ? updated : el)),
              )
              }
              onElementAdd={() => setElements((prev) => [...prev, createElement()])}
              onElementMove={moveElement}
              onElementRemove={(id) => setElements((prev) => prev.filter((el) => el.localId !== id))}
              t={t}
            />

            <TemplatePreview
              previewElements={previewElements}
              printerType={printerType}
              onPrinterTypeChange={(e) => setPrinterType(e.target.value)}
              printerTypes={PRINTER_TYPES}
              onPrintTest={handlePrintTest}
              printing={printing}
              templateExists={templateExists}
              t={t}
            />
          </div>
        </ModalBody>
        <TicketTemplatesFooter
          selectedId={selectedId}
          deleting={deleting}
          onDelete={handleDelete}
          onClose={onClose}
          onSave={handleSave}
          saving={saving}
          name={name}
          t={t}
        />
      </ModalContent>
    </Modal>
  );
}
