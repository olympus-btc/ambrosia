"use client";

import { useState, useMemo } from "react";

import Image from "next/image";

import { Button, Card, CardBody, CardFooter, CardHeader, Select, SelectItem, addToast } from "@heroui/react";
import { useTranslations, useLocale } from "next-intl";

import { useUpload } from "@components/hooks/useUpload";
import { LanguageSwitcher } from "@i18n/I18nProvider";
import { useConfigurations } from "@providers/configurations/configurationsProvider";

import { useCurrency } from "../../../hooks/useCurrency";
import { storedAssetUrl } from "../../../utils/storedAssetUrl";
import { CURRENCIES_EN } from "../../Onboarding/utils/currencies_en";
import { CURRENCIES_ES } from "../../Onboarding/utils/currencies_es";
import { usePrinters } from "../hooks/usePrinter";
import { useTemplates } from "../hooks/useTemplates";
import { StoreLayout } from "../StoreLayout";

import { EditSettingsModal } from "./EditSettingsModal";
import { PrinterSettingsCard } from "./PrinterSettings/PrinterSettingsCard";
import { TemplateList } from "./TicketTemplate/TemplateList";
import { TicketTemplatesModal } from "./TicketTemplate/TicketTemplatesModal";

export function Settings() {
  const { config, updateConfig } = useConfigurations();
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
  const [data, setData] = useState(config);
  const [editSettingsShowModal, setEditSettingsShowModal] = useState(false);
  const [ticketTemplatesModalOpen, setTicketTemplatesModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const t = useTranslations("settings");
  const locale = useLocale();
  const { currency, updateCurrency } = useCurrency();
  const { upload } = useUpload();

  const handleDataChange = (newData) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const srcLogo = storedAssetUrl(data?.businessLogoUrl);

  const CURRENCIES = useMemo(() => (locale === "en" ? CURRENCIES_EN : CURRENCIES_ES), [locale]);

  const handleEditSumbit = async (e) => {
    e.preventDefault();
    try {
      let logoUrl = data.businessLogoUrl;

      if (data.businessLogo instanceof File) {
        const [uploaded] = await upload([data.businessLogo]);
        logoUrl = uploaded?.url ?? uploaded?.path;
      } else if (data.businessLogoRemoved) {
        logoUrl = null;
      }

      const updatedData = {
        ...data,
        businessLogoUrl: logoUrl,
        businessLogo: undefined,
        businessLogoRemoved: undefined,
      };

      await updateConfig(updatedData);
      setData(updatedData);
      setEditSettingsShowModal(false);
      addToast({
        title: t("modal.updateSuccess"),
        color: "success",
      });
    } catch (error) {
      addToast({
        title: "Error",
        description: error.message,
        color: "danger",
      });
    }
  };

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
      <header className="mb-6">
        <h1 className="text-4xl font-semibold text-green-900">
          {t("title")}
        </h1>
        <p className="text-gray-800 mt-4">
          {t("subtitle")}
        </p>
      </header>

      <div className="flex flex-col flex-wrap items-stretch lg:flex-row lg:w-full lg:space-x-6">
        <div className="flex flex-col lg:w-[47%] h-auto">
          <Card shadow="none" className="rounded-lg mb-6 p-6 lg:w-full shadow-lg h-full">
            <CardHeader className="flex flex-col items-start">
              <h2 className="text-2xl font-semibold text-green-900">
                {t("cardInfo.title")}
              </h2>
            </CardHeader>

            <CardBody>
              <div className="flex flex-col max-w-2xl ">
                <div className="flex items-start justify-between my-2">
                  <div className="w-1/2">
                    <div className="font-semibold text-gray-600">{t("cardInfo.name")}</div>
                    <div className="text-xl mt-0.5 font-medium text-green-800">{data.businessName}</div>
                  </div>

                  <div className="w-1/2">
                    <div className="font-semibold text-gray-600">{t("cardInfo.rfc")}</div>
                    <div className="text-xl mt-0.5 font-medium text-green-800">
                      {data.businessTaxId ?
                        data.businessTaxId :
                        <span className="text-gray-400 italic">---</span>
                      }
                    </div>
                  </div>

                </div>

                <div className="flex items-start justify-between my-2">

                  <div className="w-1/2">
                    <div className="font-semibold text-gray-600">{t("cardInfo.address")}</div>
                    <div className="text-xl mt-0.5 font-medium text-green-800">
                      {data.businessAddress ?
                        data.businessAddress :
                        <span className="text-gray-400 italic">---</span>
                      }
                    </div>
                  </div>
                </div>

                <div className="flex items-start justify-between my-2">
                  <div className="w-1/2">
                    <div className="font-semibold text-gray-600">{t("cardInfo.email")}</div>
                    <div className="text-xl mt-0.5 font-medium text-green-800">
                      {data.businessEmail ?
                        data.businessEmail :
                        <span className="text-gray-400 italic">---</span>
                      }
                    </div>
                  </div>

                  <div className="w-1/2">
                    <div className="font-semibold text-gray-600">{t("cardInfo.phone")}</div>
                    <div className="text-xl mt-0.5 font-medium text-green-800">
                      {data.businessPhone ?
                        data.businessPhone :
                        <span className="text-gray-400 italic">---</span>
                      }
                    </div>
                  </div>
                </div>

                <div className="w-1/2">
                  <div className="font-semibold text-gray-600 mb-4">{t("cardInfo.logo")}</div>
                  {srcLogo ?
                      (
                        <Image
                          src={srcLogo}
                          width={400}
                          height={0}
                          alt="Logo"
                          className="
                            bg-[conic-gradient(#aaa_90deg,#eee_90deg_180deg,#aaa_180deg_270deg,#eee_270deg)]
                            bg-size-[20px_20px] max-w-full h-auto rounded-lg border border-border p-2                        "
                        />

                      )
                    :
                      (
                        <div className="w-40 h-40 bg-slate-100 rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center">
                          <span className="text-sm text-slate-500">{t("cardInfo.noLogo")}</span>
                        </div>
                      )
                  }
                </div>
              </div>
            </CardBody>
            <CardFooter>
              <Button
                color="primary"
                onPress={() => setEditSettingsShowModal(true)}
              >
                {t("cardInfo.edit")}
              </Button>
            </CardFooter>
          </Card>

        </div>
        <div className="flex flex-col lg:w-[47%] h-full">
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

          <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
            <CardHeader className="flex flex-col items-start">
              <h2 className="text-2xl font-semibold text-green-900">
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
        </div>
        <div className="flex flex-col lg:w-[47%] h-full">
          <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
            <CardHeader className="flex flex-col items-start">
              <h2 className="text-2xl font-semibold text-green-900">
                {t("cardCurrency.title")}
              </h2>
            </CardHeader>

            <CardBody>
              <div className="flex flex-col max-w-2xl max-w-2x">
                <div className="flex items-start justify-between my-2">
                  <div className="w-1/2">
                    <div className="font-semibold text-gray-600">{t("cardInfo.name")}</div>
                    <div className="text-xl mt-0.5 font-medium text-green-800">{currency.acronym}</div>
                  </div>

                  <Select
                    className="max-w-48"
                    label={t("cardCurrency.currencyLabel")}
                    value={data.businessCurrency}
                    onChange={handleCurrencyChange}
                  >
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {`${currency.code}  -  ${currency.name}`}
                      </SelectItem>
                    ))}
                  </Select>

                </div>

              </div>
            </CardBody>
          </Card>
        </div>
        <div className="flex flex-col lg:w-[47%] h-full">
          <Card shadow="none" className="rounded-lg mb-6 p-6 shadow-lg">
            <CardHeader className="flex flex-col items-start">
              <h2 className="text-2xl font-semibold text-green-900">
                {t("cardLanguage.title")}
              </h2>
            </CardHeader>

            <CardBody>
              <div className="flex flex-col max-w-2xl max-w-2x">
                <div className="flex items-center justify-between my-2">
                  <div className="w-1/2">
                    <div className="font-semibold text-gray-600">{t("cardInfo.name")}</div>
                    <div className="text-xl mt-0.5 font-medium text-green-800">{locale.toUpperCase()}</div>
                  </div>

                  <LanguageSwitcher />

                </div>

              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <EditSettingsModal
        data={data}
        setData={setData}
        onChange={handleDataChange}
        onSubmit={handleEditSumbit}
        editSettingsShowModal={editSettingsShowModal}
        setEditSettingsShowModal={setEditSettingsShowModal}
      />

      <TicketTemplatesModal
        isOpen={ticketTemplatesModalOpen}
        onClose={handleCloseTemplateModal}
        initialTemplate={selectedTemplate}
      />
    </StoreLayout>
  );
}
