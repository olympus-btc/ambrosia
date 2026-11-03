"use client";

import { useState, useMemo } from "react";

import { Input } from "@heroui/react";
import { useTranslations, useLocale } from "next-intl";

import { CurrencyInput } from "@components/shared/CurrencyInput";
import { ImageUploader } from "@components/shared/ImageUploader";
import { TimezoneInput } from "@components/shared/TimezoneInput";
import { TIMEZONES } from "@components/utils/timezones";

import { getBusinessTypeLabelKeys } from "./utils/businessTypeLabels";
import { CURRENCIES_EN } from "./utils/currencies_en";
import { CURRENCIES_ES } from "./utils/currencies_es";

export function BusinessDetailsStep({ businessData, onChange }) {
  const businessDetailsTranslations = useTranslations();
  const locale = useLocale();
  const [rfcError, setRfcError] = useState("");

  const CURRENCIES = useMemo(() => (locale === "en" ? CURRENCIES_EN : CURRENCIES_ES), [locale]);
  const labelKeys = getBusinessTypeLabelKeys(businessData.businessType);

  const validateRFC = (rfcValue) => {
    const upperCaseRfc = rfcValue.toUpperCase();
    const rfcRegex = /^[A-ZÑ&]{3,4}(?:\d{2})(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/;

    if (!upperCaseRfc) {
      setRfcError("");
    } else if (upperCaseRfc.length === 13 && !rfcRegex.test(upperCaseRfc)) {
      setRfcError(businessDetailsTranslations("step3.fields.businessRFCInvalid") || "RFC inválido. Debe tener formato correcto.");
    } else {
      setRfcError("");
    }

    onChange({ ...businessData, businessRFC: upperCaseRfc });
  };

  const handleCurrencyChange = (currencyCode) => {
    if (currencyCode) {
      onChange({ ...businessData, businessCurrency: currencyCode });
    }
  };

  const handleTimezoneChange = (zoneId) => {
    if (zoneId) {
      onChange({ ...businessData, timezone: zoneId });
    }
  };

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-green-900 mb-2">
        {businessDetailsTranslations(labelKeys.title)}
      </h2>
      <p className="text-gray-500 mb-4 md:mb-8">{businessDetailsTranslations("step3.subtitle")}</p>

      <div className="space-y-4 md:space-y-6">
        <Input
          label={businessDetailsTranslations(labelKeys.nameLabel)}
          type="text"
          placeholder={businessDetailsTranslations("step3.fields.businessNamePlaceholder")}
          value={businessData.businessName}
          onChange={(event) => onChange({ ...businessData, businessName: event.target.value })}
        />

        {businessData.businessType === "freelance" && (
          <Input
            label={businessDetailsTranslations("step3.fields.businessProfession")}
            type="text"
            placeholder={businessDetailsTranslations("step3.fields.businessProfessionPlaceholder")}
            value={businessData.businessProfession}
            onChange={(event) => onChange({ ...businessData, businessProfession: event.target.value })}
          />
        )}

        <Input
          label={businessDetailsTranslations("step3.fields.businessAddress")}
          type="text"
          placeholder={businessDetailsTranslations("step3.fields.businessAddressPlaceholder")}
          value={businessData.businessAddress}
          onChange={(event) => onChange({ ...businessData, businessAddress: event.target.value })}
        />

        <Input
          label={businessDetailsTranslations("step3.fields.businessPhone")}
          type="tel"
          placeholder={businessDetailsTranslations("step3.fields.businessPhonePlaceholder")}
          maxLength={10}
          value={businessData.businessPhone}
          onChange={(event) => {
            const onlyNumbers = event.target.value.replace(/\D/g, "");
            onChange({ ...businessData, businessPhone: onlyNumbers });
          }}
        />

        <Input
          label={businessDetailsTranslations("step3.fields.businessEmail")}
          type="email"
          placeholder={businessDetailsTranslations("step3.fields.businessEmailPlaceholder")}
          value={businessData.businessEmail}
          onChange={(event) => onChange({ ...businessData, businessEmail: event.target.value })}
        />

        <Input
          label={businessDetailsTranslations("step3.fields.businessRFC")}
          type="text"
          placeholder={businessDetailsTranslations("step3.fields.businessRFCPlaceholder")}
          maxLength={13}
          description={businessDetailsTranslations("step3.fields.businessRFCMessage")}
          value={businessData.businessRFC}
          onChange={(event) => validateRFC(event.target.value)}
          isInvalid={!!rfcError}
          errorMessage={rfcError}
        />

        <CurrencyInput
          currencies={CURRENCIES}
          label={businessDetailsTranslations("step3.fields.businessCurrency")}
          defaultSelectedKey={businessData.businessCurrency}
          isInvalid={!businessData.businessCurrency}
          errorMessage={businessDetailsTranslations("step3.fields.businessCurrencyError")}
          onSelectionChange={handleCurrencyChange}
        />

        <TimezoneInput
          timezones={TIMEZONES}
          label={businessDetailsTranslations("step3.fields.businessTimezone")}
          defaultSelectedKey={businessData.timezone}
          isInvalid={!businessData.timezone}
          errorMessage={businessDetailsTranslations("step3.fields.businessTimezoneError")}
          onSelectionChange={handleTimezoneChange}
        />

        <ImageUploader
          title={businessDetailsTranslations(labelKeys.logoLabel)}
          uploadText={businessDetailsTranslations("step3.fields.businessLogoUpload")}
          uploadDescription={businessDetailsTranslations("step3.fields.businessLogoUploadMessage")}
          onChange={(file) => onChange({ ...businessData, businessLogo: file })}
          image={businessData.businessLogo}
        />

      </div>
    </div>
  );
}
