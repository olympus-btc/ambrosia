"use client";

import { useState, useMemo } from "react";

import Image from "next/image";

import { Button, Card, CardBody, CardFooter, CardHeader, Select, SelectItem } from "@heroui/react";
import { useTranslations, useLocale } from "next-intl";

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
  const { templates, loading: loadingTemplates } = useTemplates();
  const [data, setData] = useState(config);
  const [editSettingsShowModal, setEditSettingsShowModal] = useState(false);
  const t = useTranslations("settings");
  const locale = useLocale();
  const { currency, updateCurrency } = useCurrency();

  const handleDataChange = (newData) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const srcLogo = storedAssetUrl(data?.businessLogoUrl);

  const CURRENCIES = useMemo(() => (locale === "en" ? CURRENCIES_EN : CURRENCIES_ES), [locale]);

  const handleEditSumbit = (e) => {
    e.preventDefault();
    updateConfig(data);
    setEditSettingsShowModal(false);
  };

  const handleCurrencyChange = (e) => {
    if (!e.target.value) { return; }
    updateCurrency({ acronym: e.target.value });
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

      <div className="flex flex-col lg:flex-row lg:w-full lg:space-x-6">
        <Card shadow="none" className="rounded-lg mb-6 p-6 lg:w-full shadow-lg">
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
                        width={200}
                        height={0}
                        alt="Logo"
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
        <div className="flex flex-col lg:w-full">
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
            t={t}
          />

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

      {editSettingsShowModal &&
        (
          <EditSettingsModal
            data={data}
            setData={setData}
            onChange={handleDataChange}
            onSubmit={handleEditSumbit}
            editSettingsShowModal={editSettingsShowModal}
            setEditSettingsShowModal={setEditSettingsShowModal}
          />
        )
      }
    </StoreLayout>
  );
}
