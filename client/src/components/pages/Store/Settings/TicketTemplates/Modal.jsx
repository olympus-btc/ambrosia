"use client";

import { useEffect, useMemo, useState } from "react";

import { addToast, Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useConfigurations } from "@/providers/configurations/configurationsProvider";
import { usePrinters } from "@components/pages/Store/hooks/usePrinter";
import { useTemplates } from "@components/pages/Store/hooks/useTemplates";

import { createElement, DEFAULT_STYLE } from "./defaults";
import { TicketTemplatesEditor } from "./Editor";
import { TicketTemplatesFooter } from "./Footer";
import { TemplatePreview } from "./Preview";
import { sampleTicket } from "./TicketElements";

const PRINTER_TYPES = ["CUSTOMER"];

export function TicketTemplatesModal({ isOpen, onClose, initialTemplate = null }) {
  const settingsTranslations = useTranslations("settings");
  const {
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useTemplates();
  const { printTicket } = usePrinters();
  const { config } = useConfigurations();

  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [elements, setElements] = useState([createElement()]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printerType, setPrinterType] = useState("CUSTOMER");

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

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const templatePayload = {
      name: name.trim(),
      elements: elements.map((element) => ({
        type: element.type,
        value: element.value ?? "",
        style: element.style || DEFAULT_STYLE,
      })),
    };
    try {
      if (selectedId) {
        await updateTemplate(selectedId, templatePayload);
      } else {
        const createdTemplate = await createTemplate(templatePayload);
        if (createdTemplate?.id) {
          setSelectedId(createdTemplate.id);
        }
      }
      addToast({ color: "success", description: settingsTranslations("templates.saveSuccess") });
    } catch (saveError) {
      console.error("Failed to save template:", saveError);
      addToast({ color: "danger", description: settingsTranslations("templates.saveError") });
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
      addToast({
        title: settingsTranslations("templates.printSuccessTitle"),
        description: settingsTranslations("templates.printSuccessDescription"),
        color: "success",
      });
    } catch (printTestError) {
      console.error("Error printing test ticket:", printTestError);
      addToast({
        title: settingsTranslations("templates.printErrorTitle"),
        description: settingsTranslations("templates.printErrorDescription"),
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
      addToast({ color: "success", description: settingsTranslations("templates.deleteSuccess") });
    } catch (deleteError) {
      console.error("Failed to delete template:", deleteError);
      addToast({ color: "danger", description: settingsTranslations("templates.deleteError") });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      size="5xl"
      isOpen={isOpen}
      onOpenChange={onClose}
      scrollBehavior="inside"
      shouldBlockScroll={false}
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto max-h-[90dvh] overflow-hidden",
      }}
    >
      <ModalContent>
        <ModalHeader>{settingsTranslations("templates.title")}</ModalHeader>
        <ModalBody>
          <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start">
            <TicketTemplatesEditor
              name={name}
              onNameChange={(event) => setName(event.target.value)}
              elements={elements}
              onElementChange={(updatedElement) => setElements((prev) => prev.map((element) => (element.localId === updatedElement.localId ? updatedElement : element)))}
              onElementAdd={() => {
                const newElement = createElement();
                setElements((prev) => [...prev, newElement]);
                return newElement;
              }}
              onElementReorder={(reorderedElements) => setElements(reorderedElements)}
              onElementRemove={(localId) => setElements((prev) => prev.filter((element) => element.localId !== localId))}
              config={config}
              settingsTranslations={settingsTranslations}
            />

            <TemplatePreview
              elements={elements}
              config={config}
              printerType={printerType}
              onPrinterTypeChange={(event) => setPrinterType(event.target.value)}
              printerTypes={PRINTER_TYPES}
              onPrintTest={handlePrintTest}
              printing={printing}
              templateExists={templateExists}
              settingsTranslations={settingsTranslations}
            />
          </div>
        </ModalBody>
        <TicketTemplatesFooter
          key={selectedId}
          selectedId={selectedId}
          deleting={deleting}
          onDelete={handleDelete}
          onClose={onClose}
          onSave={handleSave}
          saving={saving}
          name={name}
          settingsTranslations={settingsTranslations}
        />
      </ModalContent>
    </Modal>
  );
}
