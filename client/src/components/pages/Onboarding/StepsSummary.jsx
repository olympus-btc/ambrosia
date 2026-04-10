"use client";
import { Card, CardHeader, Image } from "@heroui/react";
import { useTranslations } from "next-intl";

import { EditButton } from "@components/shared/EditButton";

export function WizardSummary({ data, onEdit }) {
  const t = useTranslations();

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-green-900 mb-2">{t("step4.title")}</h2>
      <p className="text-gray-500 mb-4 md:mb-8">{t("step4.subtitle")}</p>
      <div className="space-y-4">

        <Card>
          <CardHeader className="flex justify-between items-start">
            <div className="flex flex-col">
              <p className="text-xs font-medium text-muted-foreground uppercase">{t("step4.sections.businessType.title")}</p>
              <p className="text-md font-semibold text-foreground mt-1">
                {
                  data.businessType === "store" ? t("step4.sections.businessType.store") : t("step4.sections.businessType.restaurant")
                }
              </p>
            </div>
            <EditButton onPress={() => onEdit(1)}>{t("buttons.edit")}</EditButton>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex justify-between items-start">
            <div className="flex flex-col">
              <p className="text-xs font-medium text-muted-foreground uppercase">{t("step4.sections.adminAccount.title")}</p>
              <p className="text-medium font-medium text-foreground mt-1">{t("step4.sections.adminAccount.userName")}: <span className="font-semibold">{data.userName}</span> </p>
              <p className="text-medium text-muted-foreground mt-1">{t("step4.sections.adminAccount.password")}: {"*".repeat(data.userPassword.length)}</p>
            </div>
            <EditButton onPress={() => onEdit(2)}>{t("buttons.edit")}</EditButton>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex justify-between items-start">
            <div className="flex flex-col">
              <p className="text-xs font-medium text-muted-foreground uppercase">{t("step4.sections.businessDetails.title")}</p>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">{t("step4.sections.businessDetails.businessName")}</p>
                  <p className="font-semibold text-foreground">{data.businessName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("step4.sections.businessDetails.businessAddress")}</p>
                  <p className="font-semibold text-foreground">{data.businessAddress}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("step4.sections.businessDetails.businessPhone")}</p>
                  <p className="font-semibold text-foreground">{data.businessPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("step4.sections.businessDetails.businessEmail")}</p>
                  <p className="font-semibold text-foreground">{data.businessEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("step4.sections.businessDetails.businessRFC")}</p>
                  <p className="font-semibold text-foreground">{data.businessRFC}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("step4.sections.businessDetails.businessCurrency")}</p>
                  <p className="font-semibold text-foreground">{data.businessCurrency}</p>
                </div>
              </div>
              {data.businessLogo && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Logo</p>
                  <div
                    className="
                      bg-[conic-gradient(#aaa_90deg,#eee_90deg_180deg,#aaa_180deg_270deg,#eee_270deg)]
                      bg-size-[20px_20px] rounded border border-border p-2
                    "
                  >
                    <Image
                      src={URL.createObjectURL(data.businessLogo)}
                      alt="Business logo"
                      className="w-24 h-24 md:w-32 md:h-32 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
            <EditButton onPress={() => onEdit(3)}>{t("buttons.edit")}</EditButton>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
