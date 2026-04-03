"use client";

import Image from "next/image";

import { Button, Card, CardBody, CardFooter, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { storedAssetUrl } from "../../../../utils/storedAssetUrl";

export function StoreInfoCard({ data, onEdit }) {
  const t = useTranslations("settings");
  const srcLogo = storedAssetUrl(data?.businessLogoUrl);

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg h-full">
      <CardHeader className="flex flex-col items-start pb-0">
        <h2 className="text-lg sm:text-xl xl:text-2xl font-semibold text-green-900">
          {t("cardInfo.title")}
        </h2>
      </CardHeader>

      <CardBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-3">
            <div className="sm:w-1/2">
              <div className="text-xs sm:text-sm xl:text-base font-semibold text-gray-600">{t("cardInfo.name")}</div>
              <div className="text-sm sm:text-base xl:text-lg font-medium text-green-800 truncate">{data.businessName}</div>
            </div>
            <div className="sm:w-1/2">
              <div className="text-xs sm:text-sm xl:text-base font-semibold text-gray-600">{t("cardInfo.rfc")}</div>
              <div className="text-sm sm:text-base xl:text-lg font-medium text-green-800 truncate">
                {data.businessTaxId ?
                  data.businessTaxId :
                  <span className="text-gray-400 italic">---</span>
                }
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs sm:text-sm xl:text-base font-semibold text-gray-600">{t("cardInfo.address")}</div>
            <div className="text-sm sm:text-base xl:text-lg font-medium text-green-800">
              {data.businessAddress ?
                data.businessAddress :
                <span className="text-gray-400 italic">---</span>
              }
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-3">
            <div className="sm:w-1/2">
              <div className="text-xs sm:text-sm xl:text-base font-semibold text-gray-600">{t("cardInfo.email")}</div>
              <div className="text-sm sm:text-base xl:text-lg font-medium text-green-800 truncate">
                {data.businessEmail ?
                  data.businessEmail :
                  <span className="text-gray-400 italic">---</span>
                }
              </div>
            </div>
            <div className="sm:w-1/2">
              <div className="text-xs sm:text-sm xl:text-base font-semibold text-gray-600">{t("cardInfo.phone")}</div>
              <div className="text-sm sm:text-base xl:text-lg font-medium text-green-800 truncate">
                {data.businessPhone ?
                  data.businessPhone :
                  <span className="text-gray-400 italic">---</span>
                }
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs sm:text-sm xl:text-base font-semibold text-gray-600">{t("cardInfo.logo")}</div>
              {!srcLogo && (
                <span className="text-sm text-gray-400 italic">{t("cardInfo.noLogo")}</span>
              )}
            </div>
            {srcLogo && (
              <Image
                src={srcLogo}
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
        <Button
          color="primary"
          className="h-8 min-w-16 px-3 rounded-small sm:h-10 sm:min-w-20 sm:px-4 sm:rounded-medium"
          onPress={onEdit}
        >
          {t("cardInfo.edit")}
        </Button>
      </CardFooter>
    </Card>
  );
}
