"use client";

import { useState } from "react";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";
import { isElectron } from "@lib/isElectron";

import { usePrinters } from "../hooks/usePrinter";
import { useTemplates } from "../hooks/useTemplates";
import { StoreLayout } from "../StoreLayout";

import { Currency } from "./Currency";
import { Language } from "./Language";
import { LightningCard } from "./Lightning/LightningCard";
import { PrinterSettingsCard } from "./Printer/PrinterSettingsCard";
import { SeedCard } from "./Seed/SeedCard";
import { StoreInfo } from "./StoreInfo";
import { TemplateList } from "./TicketTemplate/List";
import { TicketTemplatesModal } from "./TicketTemplate/Modal";
import { TutorialsCard } from "./Tutorials/TutorialsCard";

export function Settings() {
  const {
    availablePrinters,
    printerConfigs,
    loadingAvailable,
    loadingConfigs,
    error: printersError,
    createPrinterConfig,
    updatePrinterConfig,
    deletePrinterConfig,
    setDefaultPrinterConfig,
  } = usePrinters();
  const { templates, loading: loadingTemplates, error: templatesError, refetch: refetchTemplates } = useTemplates();
  const [ticketTemplatesModalOpen, setTicketTemplatesModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const t = useTranslations("settings");

  const handleOpenTemplateModal = (template = null) => {
    setSelectedTemplate(template);
    setTicketTemplatesModalOpen(true);
  };

  const handleCloseTemplateModal = () => {
    setTicketTemplatesModalOpen(false);
    setSelectedTemplate(null);
    refetchTemplates();
  };

  return (
    <StoreLayout>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-6">
          <StoreInfo />
          <Currency />
          <Language />
          <SeedCard />
          <TutorialsCard t={t} />
        </div>

        <div className="flex flex-col gap-6">
          <PrinterSettingsCard
            availablePrinters={availablePrinters}
            printerConfigs={printerConfigs}
            loadingAvailable={loadingAvailable}
            loadingConfigs={loadingConfigs}
            loadingTemplates={loadingTemplates}
            templates={templates}
            error={printersError}
            createPrinterConfig={createPrinterConfig}
            updatePrinterConfig={updatePrinterConfig}
            deletePrinterConfig={deletePrinterConfig}
            setDefaultPrinterConfig={setDefaultPrinterConfig}
            onTemplatesRefresh={refetchTemplates}
            t={t}
          />

          <Card shadow="none" className="rounded-lg p-6 shadow-lg">
            <CardHeader className="flex flex-col items-start">
              <h2 className="text-lg font-semibold text-green-900">
                {t("templates.title")}
              </h2>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col max-w-2xl">
                <TemplateList
                  templates={templates}
                  selectedId={selectedTemplate?.id || ""}
                  loading={loadingTemplates}
                  error={templatesError}
                  onSelect={handleOpenTemplateModal}
                  onNew={() => handleOpenTemplateModal(null)}
                  t={t}
                />
              </div>
            </CardBody>
          </Card>

          {isElectron && <LightningCard />}
        </div>
      </div>

      <TicketTemplatesModal
        isOpen={ticketTemplatesModalOpen}
        onClose={handleCloseTemplateModal}
        initialTemplate={selectedTemplate}
      />
    </StoreLayout>
  );
}
