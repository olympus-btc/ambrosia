"use client";

import { useState, useMemo } from "react";

import { Input } from "@heroui/react";
import { useTranslations, useLocale } from "next-intl";

import { CurrencyInput } from "@components/shared/CurrencyInput";
import { ImageUploader } from "@components/shared/ImageUploader";
import { TimezoneInput } from "@components/shared/TimezoneInput";
import { TIMEZONES } from "@components/utils/timezones";

import { CURRENCIES_EN } from "./utils/currencies_en";
import { CURRENCIES_ES } from "./utils/currencies_es";

export function BusinessDetailsStep({ data, onChange }) {
  const businessDetailsTranslations = useTranslations();
  const locale = useLocale();
  const [rfcError, setRfcError] = useState("");

  const CURRENCIES = useMemo(() => (locale === "en" ? CURRENCIES_EN : CURRENCIES_ES), [locale]);

  const validateRFC = (rfcValue) => {
    const upperValue = rfcValue.toUpperCase();
    const rfcRegex = /^[A-ZÑ&]{3,4}(?:\d{2})(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/;

    if (!upperValue) {
      setRfcError("");
    } else if (upperValue.length === 13 && !rfcRegex.test(upperValue)) {
      setRfcError(businessDetailsTranslations("step3.fields.businessRFCInvalid") || "RFC inválido. Debe tener formato correcto.");
    } else {
      setRfcError("");
    }

    onChange({ ...data, businessRFC: upperValue });
  };

  const handleCurrencyChange = (currencyCode) => {
    if (currencyCode) {
      onChange({ ...data, businessCurrency: currencyCode });
    }
  };

  const handleTimezoneChange = (zoneId) => {
    if (zoneId) {
      onChange({ ...data, timezone: zoneId });
    }
  };

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-green-900 mb-2">
        {data.businessType === "store" ? businessDetailsTranslations("step3.titleStore") : businessDetailsTranslations("step3.titleRestaurant")}
      </h2>
      <p className="text-gray-500 mb-4 md:mb-8">{businessDetailsTranslations("step3.subtitle")}</p>

      <div className="space-y-4 md:space-y-6">
        <Input
          label={data.businessType === "store" ? businessDetailsTranslations("step3.fields.businessrNameLabelStore") : businessDetailsTranslations("step3.fields.businessrNameLabelRestaurant")}
          type="text"
          placeholder={businessDetailsTranslations("step3.fields.businessNamePlaceholder")}
          value={data.businessName}
          onChange={(event) => onChange({ ...data, businessName: event.target.value })}
        />

        <Input
          label={businessDetailsTranslations("step3.fields.businessAddress")}
          type="text"
          placeholder={businessDetailsTranslations("step3.fields.businessAddressPlaceholder")}
          value={data.businessAddress}
          onChange={(event) => onChange({ ...data, businessAddress: event.target.value })}
        />

        <Input
          label={businessDetailsTranslations("step3.fields.businessPhone")}
          type="tel"
          placeholder={businessDetailsTranslations("step3.fields.businessPhonePlaceholder")}
          maxLength={10}
          value={data.businessPhone}
          onChange={(event) => {
            const onlyNumbers = event.target.value.replace(/\D/g, "");
            onChange({ ...data, businessPhone: onlyNumbers });
          }}
        />

        <Input
          label={businessDetailsTranslations("step3.fields.businessEmail")}
          type="email"
          placeholder={businessDetailsTranslations("step3.fields.businessEmailPlaceholder")}
          value={data.businessEmail}
          onChange={(event) => onChange({ ...data, businessEmail: event.target.value })}
        />

        <Input
          label={businessDetailsTranslations("step3.fields.businessRFC")}
          type="text"
          placeholder={businessDetailsTranslations("step3.fields.businessRFCPlaceholder")}
          maxLength={13}
          description={businessDetailsTranslations("step3.fields.businessRFCMessage")}
          value={data.businessRFC}
          onChange={(event) => validateRFC(event.target.value)}
          isInvalid={!!rfcError}
          errorMessage={rfcError}
        />

        <CurrencyInput
          currencies={CURRENCIES}
          label={businessDetailsTranslations("step3.fields.businessCurrency")}
          defaultSelectedKey={data.businessCurrency}
          isInvalid={!data.businessCurrency}
          errorMessage={businessDetailsTranslations("step3.fields.businessCurrencyError")}
          onSelectionChange={handleCurrencyChange}
        />

        <TimezoneInput
          timezones={TIMEZONES}
          label={businessDetailsTranslations("step3.fields.businessTimezone")}
          defaultSelectedKey={data.timezone}
          isInvalid={!data.timezone}
          errorMessage={businessDetailsTranslations("step3.fields.businessTimezoneError")}
          onSelectionChange={handleTimezoneChange}
        />

        <ImageUploader
          title={data.businessType === "store" ? businessDetailsTranslations("step3.fields.businessLogoLabelStore") : businessDetailsTranslations("step3.fields.businessLogoLabelRestaurant")}
          uploadText={businessDetailsTranslations("step3.fields.businessLogoUpload")}
          uploadDescription={businessDetailsTranslations("step3.fields.businessLogoUploadMessage")}
          onChange={(file) => onChange({ ...data, businessLogo: file })}
          image={data.businessLogo}
        />

      </div>
    </div>
  );
}
