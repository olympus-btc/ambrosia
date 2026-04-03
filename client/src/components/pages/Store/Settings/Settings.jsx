"use client";

import { useState, useMemo } from "react";

import { Card, CardBody, CardHeader, Select, SelectItem } from "@heroui/react";
import { useTranslations, useLocale } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";
import { LanguageSwitcher } from "@i18n/I18nProvider";
import { isElectron } from "@lib/isElectron";
import { useConfigurations } from "@providers/configurations/configurationsProvider";

import { useCurrency } from "../../../hooks/useCurrency";
import { CURRENCIES_EN } from "../../Onboarding/utils/currencies_en";
import { CURRENCIES_ES } from "../../Onboarding/utils/currencies_es";
import { usePrinters } from "../hooks/usePrinter";
import { useTemplates } from "../hooks/useTemplates";
import { StoreLayout } from "../StoreLayout";

import { LightningCard } from "./Lightning/LightningCard";
import { PrinterSettingsCard } from "./Printer/PrinterSettingsCard";
import { SeedCard } from "./Seed/SeedCard";
import { StoreInfo } from "./StoreInfo";
import { TemplateList } from "./TicketTemplate/List";
import { TicketTemplatesModal } from "./TicketTemplate/Modal";
import { TutorialsCard } from "./Tutorials/TutorialsCard";

export function Settings() {
  const { config } = useConfigurations();
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
  const locale = useLocale();
  const { currency, updateCurrency } = useCurrency();

  const CURRENCIES = useMemo(() => (locale === "en" ? CURRENCIES_EN : CURRENCIES_ES), [locale]);

  const handleCurrencyChange = (e) => {
    if (!e.target.value) { return; }
    updateCurrency({ acronym: e.target.value });
  };

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

          <Card shadow="none" className="rounded-lg p-6 shadow-lg">
            <CardHeader className="flex flex-col items-start">
              <h2 className="text-lg font-semibold text-green-900">
                {t("cardCurrency.title")}
              </h2>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="sm:w-1/2">
                  <div className="font-semibold text-gray-600">{t("cardInfo.name")}</div>
                  <div className="text-base mt-0.5 font-medium text-green-800">{currency.acronym}</div>
                </div>
                <Select
                  className="w-full sm:max-w-48"
                  label={t("cardCurrency.currencyLabel")}
                  value={config.businessCurrency}
                  onChange={handleCurrencyChange}
                >
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {`${currency.code}  -  ${currency.name}`}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </CardBody>
          </Card>

          <Card shadow="none" className="rounded-lg p-6 shadow-lg">
            <CardHeader className="flex flex-col items-start">
              <h2 className="text-lg font-semibold text-green-900">
                {t("cardLanguage.title")}
              </h2>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="sm:w-1/2">
                  <div className="font-semibold text-gray-600">{t("cardInfo.name")}</div>
                  <div className="text-base mt-0.5 font-medium text-green-800">{locale.toUpperCase()}</div>
                </div>
                <LanguageSwitcher />
              </div>
            </CardBody>
          </Card>

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
