"use client"
import { useState, useRef, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl";
import { Input, Select, SelectItem } from "@heroui/react"
import { Upload, X } from "lucide-react"

import { CURRENCIES_EN } from "./utils/currencies_en";
import { CURRENCIES_ES } from "./utils/currencies_es";

export function BusinessDetailsStep({ data, onChange }) {
  const t = useTranslations();
  const locale = useLocale();

  const [rfcError, setRfcError] = useState("");
  const [logoPreview, setLogoPreview] = useState(null);
  const [CURRENCIES, setCURRENCIES] = useState(CURRENCIES_ES);
  const fileInputRef = useRef(null);

  const validateRFC = (value) => {
    const upperValue = value.toUpperCase();
    const rfcRegex = /^[A-ZÑ&]{3,4}(?:\d{2})(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/;

    if (!upperValue) {
      setRfcError("");
    } else if (upperValue.length === 13 && !rfcRegex.test(upperValue)) {
      setRfcError(t("step3.fields.businessRFCInvalid") || "RFC inválido. Debe tener formato correcto.");
    } else {
      setRfcError("");
    }

    onChange({ ...data, businessRFC: upperValue });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      onChange({ storeLogo: file })

      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    onChange({ storeLogo: null })
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  useEffect(() => {
  if (locale === "en") {
      setCURRENCIES(CURRENCIES_EN);
    } else {
      setCURRENCIES(CURRENCIES_ES);
    }
  }, [locale]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-2">
        {data.businessType === 'store' ? t("step3.titleStore") : t("step3.titleRestaurant")}
      </h2>
      <p className="text-muted-foreground mb-8">{t("step3.subtitle")}</p>

      <div className="space-y-6">
        <Input
          label={data.businessType === 'store' ? t("step3.fields.businessrNameLabelStore") : t("step3.fields.businessrNameLabelRestaurant")}
          type="text"
          placeholder={t("step3.fields.businessNamePlaceholder")}
          value={data.businessName}
          onChange={(e) => onChange({ ...data, businessName: e.target.value })}
        />

        <Input
          label={t("step3.fields.businessAddress")}
          type="text"
          placeholder={t("step3.fields.businessAddressPlaceholder")}
          value={data.businessAddress}
          onChange={(e) => onChange({ ...data, businessAddress: e.target.value })}
        />

        <Input
          label={t("step3.fields.businessPhone")}
          type="tel"
          placeholder={t("step3.fields.businessPhonePlaceholder")}
          maxLength={10}
          value={data.businessPhone}
          onChange={(e) => {
            const onlyNumbers = e.target.value.replace(/\D/g, "");
            onChange({ ...data, businessPhone: onlyNumbers });
          }}
        />

        <Input
          label={t("step3.fields.businessEmail")}
          type="email"
          placeholder={t("step3.fields.businessEmailPlaceholder")}
          value={data.businessEmail}
          onChange={(e) => onChange({ ...data, businessEmail: e.target.value })}
        />

        <Input
          label={t("step3.fields.businessRFC")}
          type="text"
          placeholder={t("step3.fields.businessRFCPlaceholder")}
          maxLength={13}
          description={t("step3.fields.businessRFCMessage")}
          value={data.businessRFC}
          onChange={(e) => validateRFC(e.target.value)}
          isInvalid={!!rfcError}
          errorMessage={rfcError}
        />

        <Select
          label={t("step3.fields.businessCurrency")}
          defaultSelectedKeys={[data.businessCurrency]}
          value={data.businessCurrency}
          onChange={(e) => onChange({ ...data, businessCurrency: e.target.value })}
        >
          {CURRENCIES.map((currency) => (
              <SelectItem key={currency.code}>
                {`${currency.code}  -  ${currency.name}`}
              </SelectItem>
            ))}
        </Select>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            { data.businessType === 'store' ? t("step3.fields.businessLogoLabelStore") : t("step3.fields.businessLogoLabelRestaurant")}
          </label>
          {logoPreview ? (
            <div className="relative w-32 h-32 rounded-lg border-2 border-border overflow-hidden bg-muted">
              <img src={logoPreview || "/placeholder.svg"} alt="Logo preview" className="w-full h-full object-cover" />
              <button
                onClick={handleRemoveLogo}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded hover:opacity-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center cursor-pointer"
            >
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">{t("step3.fields.businessLogoUpload")}</p>
              <p className="text-xs text-muted-foreground">{t("step3.fields.businessLogoUploadMessage")}</p>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
        </div>
      </div>
    </div>
  )
}
