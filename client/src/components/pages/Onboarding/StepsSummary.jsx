"use client";
import { Card, CardHeader, Image } from "@heroui/react";
import { useTranslations } from "next-intl";

import { EditButton } from "@components/shared/EditButton";

import { getBusinessTypeLabelKeys, KNOWN_BUSINESS_TYPES } from "./utils/businessTypeLabels";

export function WizardSummary({ onboardingData, onEdit }) {
  const summaryTranslations = useTranslations();
  const businessNameLabelKey = getBusinessTypeLabelKeys(onboardingData.businessType).nameLabel;

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-green-900 mb-2">{summaryTranslations("step4.title")}</h2>
      <p className="text-gray-500 mb-4 md:mb-8">{summaryTranslations("step4.subtitle")}</p>
      <div className="space-y-4">

        <Card>
          <CardHeader className="flex justify-between items-start">
            <div className="flex flex-col">
              <p className="text-xs font-medium text-muted-foreground uppercase">{summaryTranslations("step4.sections.businessType.title")}</p>
              <p className="text-md font-semibold text-foreground mt-1">
                {summaryTranslations(`step4.sections.businessType.${KNOWN_BUSINESS_TYPES.includes(onboardingData.businessType) ? onboardingData.businessType : "restaurant"}`)}
              </p>
            </div>
            <EditButton onPress={() => onEdit(1)}>{summaryTranslations("buttons.edit")}</EditButton>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex justify-between items-start">
            <div className="flex flex-col">
              <p className="text-xs font-medium text-muted-foreground uppercase">{summaryTranslations("step4.sections.walletBackend.title")}</p>
              <p className="text-md font-semibold text-foreground mt-1">
                {onboardingData.walletBackend === "nwc"
                  ? summaryTranslations("step4.sections.walletBackend.nwc")
                  : summaryTranslations("step4.sections.walletBackend.phoenixd")}
              </p>
              {onboardingData.walletBackend === "nwc" && onboardingData.nwcUri && (
                <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                  {onboardingData.nwcUri.length > 60 ? `${onboardingData.nwcUri.slice(0, 60)}…` : onboardingData.nwcUri}
                </p>
              )}
              {onboardingData.walletBackend === "phoenixd" && onboardingData.phoenixdRemote && (
                <p className="text-xs text-muted-foreground mt-1">
                  {summaryTranslations("step4.sections.walletBackend.phoenixdRemote")}
                  {onboardingData.phoenixdUrl && (
                    <span className="font-mono break-all"> — {onboardingData.phoenixdUrl}</span>
                  )}
                </p>
              )}
            </div>
            <EditButton onPress={() => onEdit(2)}>{summaryTranslations("buttons.edit")}</EditButton>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex justify-between items-start">
            <div className="flex flex-col">
              <p className="text-xs font-medium text-muted-foreground uppercase">{summaryTranslations("step4.sections.adminAccount.title")}</p>
              <p className="text-medium font-medium text-foreground mt-1">{summaryTranslations("step4.sections.adminAccount.userName")}: <span className="font-semibold">{onboardingData.userName}</span> </p>
              <p className="text-medium text-muted-foreground mt-1">{summaryTranslations("step4.sections.adminAccount.password")}: {"*".repeat(onboardingData.userPassword.length)}</p>
            </div>
            <EditButton onPress={() => onEdit(3)}>{summaryTranslations("buttons.edit")}</EditButton>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex justify-between items-start">
            <div className="flex flex-col">
              <p className="text-xs font-medium text-muted-foreground uppercase">{summaryTranslations("step4.sections.secretsEncryption.title")}</p>
              <p className="text-md font-semibold text-foreground mt-1">
                {onboardingData.activateSecretsEncryption
                  ? summaryTranslations("step4.sections.secretsEncryption.active")
                  : summaryTranslations("step4.sections.secretsEncryption.inactive")}
              </p>
            </div>
            <EditButton onPress={() => onEdit(5)}>{summaryTranslations("buttons.edit")}</EditButton>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex justify-between items-start">
            <div className="flex flex-col">
              <p className="text-xs font-medium text-muted-foreground uppercase">{summaryTranslations("step4.sections.businessDetails.title")}</p>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">{summaryTranslations(businessNameLabelKey)}</p>
                  <p className="font-semibold text-foreground">{onboardingData.businessName}</p>
                </div>
                {onboardingData.businessType === "freelance" && (
                  <div>
                    <p className="text-xs text-muted-foreground">{summaryTranslations("step4.sections.businessDetails.businessProfession")}</p>
                    <p className="font-semibold text-foreground">{onboardingData.businessProfession}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">{summaryTranslations("step4.sections.businessDetails.businessAddress")}</p>
                  <p className="font-semibold text-foreground">{onboardingData.businessAddress}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{summaryTranslations("step4.sections.businessDetails.businessPhone")}</p>
                  <p className="font-semibold text-foreground">{onboardingData.businessPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{summaryTranslations("step4.sections.businessDetails.businessEmail")}</p>
                  <p className="font-semibold text-foreground">{onboardingData.businessEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{summaryTranslations("step4.sections.businessDetails.businessRFC")}</p>
                  <p className="font-semibold text-foreground">{onboardingData.businessRFC}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{summaryTranslations("step4.sections.businessDetails.businessCurrency")}</p>
                  <p className="font-semibold text-foreground">{onboardingData.businessCurrency}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{summaryTranslations("step4.sections.businessDetails.businessTimezone")}</p>
                  <p className="font-semibold text-foreground">{onboardingData.timezone}</p>
                </div>
              </div>
              {onboardingData.businessLogo && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Logo</p>
                  <div
                    className="
                      bg-[conic-gradient(#aaa_90deg,#eee_90deg_180deg,#aaa_180deg_270deg,#eee_270deg)]
                      bg-size-[20px_20px] rounded border border-border p-2
                    "
                  >
                    <Image
                      src={URL.createObjectURL(onboardingData.businessLogo)}
                      alt="Business logo"
                      className="w-24 h-24 md:w-32 md:h-32 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
            <EditButton onPress={() => onEdit(4)}>{summaryTranslations("buttons.edit")}</EditButton>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
