"use client";

import Image from "next/image";

import { Button, Card, CardBody, CardFooter, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { storedAssetUrl } from "@/components/utils/storedAssetUrl";
import { RequirePermission } from "@/hooks/usePermission";

function BusinessInfoField({ businessInfoLabel, businessInfoValue }) {
  return (
    <div className="sm:w-1/2">
      <div className="text-xs sm:text-sm xl:text-base font-semibold text-gray-600">{businessInfoLabel}</div>
      <div className="text-sm sm:text-base xl:text-lg font-medium text-green-800 truncate">
        {businessInfoValue || <span className="text-gray-400 italic">---</span>}
      </div>
    </div>
  );
}

export function FreelancerInfoCard({ businessInfo, onEdit }) {
  const freelancerSettingsTranslations = useTranslations("freelancerSettings");
  const logoSrc = storedAssetUrl(businessInfo?.businessLogoUrl);

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {freelancerSettingsTranslations("cardInfo.title")}
        </h2>
      </CardHeader>

      <CardBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-3">
            <BusinessInfoField businessInfoLabel={freelancerSettingsTranslations("cardInfo.name")} businessInfoValue={businessInfo.businessName} />
            <BusinessInfoField businessInfoLabel={freelancerSettingsTranslations("cardInfo.profession")} businessInfoValue={businessInfo.businessProfession} />
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-3">
            <BusinessInfoField businessInfoLabel={freelancerSettingsTranslations("cardInfo.taxId")} businessInfoValue={businessInfo.businessTaxId} />
            <BusinessInfoField businessInfoLabel={freelancerSettingsTranslations("cardInfo.address")} businessInfoValue={businessInfo.businessAddress} />
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-3">
            <BusinessInfoField businessInfoLabel={freelancerSettingsTranslations("cardInfo.email")} businessInfoValue={businessInfo.businessEmail} />
            <BusinessInfoField businessInfoLabel={freelancerSettingsTranslations("cardInfo.phone")} businessInfoValue={businessInfo.businessPhone} />
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-3">
            <BusinessInfoField businessInfoLabel={freelancerSettingsTranslations("cardInfo.timezone")} businessInfoValue={businessInfo.timezone} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs sm:text-sm xl:text-base font-semibold text-gray-600">{freelancerSettingsTranslations("cardInfo.logo")}</div>
              {!logoSrc && (
                <span className="text-sm text-gray-400 italic">{freelancerSettingsTranslations("cardInfo.noLogo")}</span>
              )}
            </div>
            {logoSrc && (
              <Image
                src={logoSrc}
                width={120}
                height={48}
                alt="Logo"
                className="h-12 w-auto max-w-[120px] object-contain rounded-lg border border-border p-1"
              />
            )}
          </div>
        </div>
      </CardBody>

      <CardFooter className="flex justify-end">
        <RequirePermission allOf={["settings_update"]}>
          <Button
            color="primary"
            className="h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium"
            onPress={onEdit}
          >
            {freelancerSettingsTranslations("cardInfo.edit")}
          </Button>
        </RequirePermission>
      </CardFooter>
    </Card>
  );
}
