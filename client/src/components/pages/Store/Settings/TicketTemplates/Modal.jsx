"use client";

import { useEffect, useMemo, useState } from "react";

import { addToast, Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { useConfigurations } from "@/providers/configurations/configurationsProvider";
import { usePrinters } from "@components/pages/Store/hooks/usePrinter";
import { useTemplates } from "@components/pages/Store/hooks/useTemplates";

import { createDefaultElements, createElement, DEFAULT_TICKET_TYPE, DEFAULT_PRINT_FORMATS, DEFAULT_STYLE } from "./defaults";
import { TicketTemplatesEditor } from "./Editor";
import { TicketTemplatesFooter } from "./Footer";
import { TemplatePreview } from "./Preview";
import { useSampleShiftReport, useSampleTicket } from "./TicketElements";

const PRINTER_TYPES = ["CUSTOMER"];

export function TicketTemplatesModal({ isOpen, onClose, initialTemplate = null }) {
  const settingsTranslations = useTranslations("settings");
  const {
    templates: existingTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setDefaultTemplate,
  } = useTemplates();
  const { printTicket } = usePrinters();
  const { config } = useConfigurations();
  const sampleTicket = useSampleTicket();
  const sampleShiftReport = useSampleShiftReport();

  const [selectedId, setSelectedId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [ticketType, setTicketType] = useState(DEFAULT_TICKET_TYPE);
  const [isDefault, setIsDefault] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [templateElements, setTemplateElements] = useState([createElement()]);
  const [printFormats, setPrintFormats] = useState(DEFAULT_PRINT_FORMATS);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printerType, setPrinterType] = useState("CUSTOMER");

  useEffect(() => {
    if (isOpen && initialTemplate) {
      setSelectedId(initialTemplate.id);
      setTemplateName(initialTemplate.name);
      setTicketType(initialTemplate.ticketType || DEFAULT_TICKET_TYPE);
      setIsDefault(Boolean(initialTemplate.isDefault));
      setPrintFormats({
        dateFormat: initialTemplate.dateFormat || DEFAULT_PRINT_FORMATS.dateFormat,
        timeFormat: initialTemplate.timeFormat || DEFAULT_PRINT_FORMATS.timeFormat,
      });
      const mappedElements = (initialTemplate.elements || []).map((element) => ({
        localId: element.id || `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: element.type,
        value: element.value,
        style: element.style || DEFAULT_STYLE,
      }));
      setTemplateElements(mappedElements.length ? mappedElements : [createElement()]);
    } else if (isOpen && !initialTemplate) {
      setSelectedId("");
      setTemplateName("");
      setTicketType(DEFAULT_TICKET_TYPE);
      setIsDefault(false);
      setPrintFormats(DEFAULT_PRINT_FORMATS);
      setTemplateElements([createElement()]);
    }
  }, [isOpen, initialTemplate]);

  const resetForm = () => {
    setSelectedId("");
    setTemplateName("");
    setTicketType(DEFAULT_TICKET_TYPE);
    setIsDefault(false);
    setPrintFormats(DEFAULT_PRINT_FORMATS);
    setTemplateElements([createElement()]);
  };

  const handleTicketTypeChange = (selectedTicketType) => {
    setTicketType(selectedTicketType);
    setTemplateElements(createDefaultElements(selectedTicketType));
  };

  const handleSave = async () => {
    if (!templateName.trim()) return;
    setSaving(true);
    const templatePayload = {
      name: templateName.trim(),
      ticketType,
      dateFormat: printFormats.dateFormat,
      timeFormat: printFormats.timeFormat,
      elements: templateElements.map((element) => ({
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
          setIsDefault(!existingTemplates.some((template) => template.ticketType === ticketType && template.isDefault));
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
    if (!templateName.trim()) return;
    setPrinting(true);
    try {
      const samplePrintableTicket = ticketType === "SHIFT_CLOSE"
        ? { shiftReport: sampleShiftReport }
        : { ticketData: sampleTicket };
      await printTicket({
        templateName: templateName.trim(),
        ticketType,
        ...samplePrintableTicket,
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
    () => existingTemplates.some((template) => template.name === templateName.trim()),
    [existingTemplates, templateName],
  );

  const handleSetDefault = async () => {
    if (!selectedId) return;
    setSettingDefault(true);
    try {
      await setDefaultTemplate(selectedId);
      setIsDefault(true);
      addToast({ color: "success", description: settingsTranslations("templates.setDefaultSuccess") });
    } catch (setDefaultError) {
      console.error("Failed to set default template:", setDefaultError);
      addToast({ color: "danger", description: settingsTranslations("templates.setDefaultError") });
    } finally {
      setSettingDefault(false);
    }
  };

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
              templateName={templateName}
              onTemplateNameChange={(event) => setTemplateName(event.target.value)}
              ticketType={ticketType}
              onTicketTypeChange={handleTicketTypeChange}
              isTicketTypeLocked={Boolean(selectedId)}
              printFormats={printFormats}
              onPrintFormatsChange={setPrintFormats}
              templateElements={templateElements}
              onElementChange={(updatedElement) => setTemplateElements((currentTemplateElements) => currentTemplateElements.map((element) => (element.localId === updatedElement.localId ? updatedElement : element)))}
              onElementAdd={() => {
                const newElement = createElement();
                setTemplateElements((currentTemplateElements) => [...currentTemplateElements, newElement]);
                return newElement;
              }}
              onElementReorder={(reorderedElements) => setTemplateElements(reorderedElements)}
              onElementRemove={(localId) => setTemplateElements((currentTemplateElements) => currentTemplateElements.filter((element) => element.localId !== localId))}
              config={config}
              settingsTranslations={settingsTranslations}
            />

            <TemplatePreview
              templateElements={templateElements}
              businessConfig={config}
              printFormats={printFormats}
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
          isDefault={isDefault}
          settingDefault={settingDefault}
          onSetDefault={handleSetDefault}
          deleting={deleting}
          onDelete={handleDelete}
          onClose={onClose}
          onSave={handleSave}
          saving={saving}
          templateName={templateName}
          settingsTranslations={settingsTranslations}
        />
      </ModalContent>
    </Modal>
  );
}
