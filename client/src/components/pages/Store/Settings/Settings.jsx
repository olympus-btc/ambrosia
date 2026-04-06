"use client";

import { useState } from "react";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";
import { isElectron } from "@lib/isElectron";

import { useTemplates } from "../hooks/useTemplates";
import { StoreLayout } from "../StoreLayout";

import { Currency } from "./Currency";
import { Language } from "./Language";
import { LightningCard } from "./Lightning/LightningCard";
import { Printers } from "./Printers";
import { Seed } from "./Seed";
import { StoreInfo } from "./StoreInfo";
import { TemplateList } from "./TicketTemplate/List";
import { TicketTemplatesModal } from "./TicketTemplate/Modal";
import { Tutorials } from "./Tutorials";

export function Settings() {
  const t = useTranslations("settings");
  const { templates, loading: loadingTemplates, error: templatesError, refetch: refetchTemplates } = useTemplates();
  const [ticketTemplatesModalOpen, setTicketTemplatesModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

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
          <Seed />
          <Tutorials />
        </div>

        <div className="flex flex-col gap-6">
          <Printers />

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
