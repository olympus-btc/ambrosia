"use client";

import { useEffect, useState } from "react";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";

export function QRUrlCard() {
  const [urlBase, setUrlBase] = useState("");
  const settingsTranslations = useTranslations("settings");

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setUrlBase(window.location.origin);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  if (!urlBase) return null;

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex items-start gap-3 pb-2">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-green-900 sm:text-xl xl:text-2xl">
            {settingsTranslations("cardQRUrl.title")}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {settingsTranslations("cardQRUrl.subtitle")}
          </p>
        </div>
      </CardHeader>

      <CardBody className="items-center gap-4 pt-4">
        <div className="w-full max-w-64 rounded-xl border border-gray-200 bg-white p-4 sm:max-w-72">
          <QRCode
            aria-label={settingsTranslations("cardQRUrl.qrLabel")}
            bgColor="#FFFFFF"
            fgColor="#14532D"
            level="M"
            size={256}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            value={urlBase}
          />
        </div>
        <p className="text-center text-xs text-gray-500">
          {settingsTranslations("cardQRUrl.helper")}
        </p>
      </CardBody>
    </Card>
  );
}
