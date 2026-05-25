"use client";

import { useState } from "react";

import { Card, CardBody, Input } from "@heroui/react";
import { Zap, Server } from "lucide-react";
import { useTranslations } from "next-intl";

const NWC_URI_REGEX = /^nostr\+walletconnect:\/\/[0-9a-f]{64}\?/;

export function WalletBackendStep({ data, onChange }) {
  const t = useTranslations();
  const [uriError, setUriError] = useState("");

  const isNwc = !!data.nwcUri || data.walletBackend === "nwc";

  const handleSelect = (backend) => {
    onChange({ walletBackend: backend, nwcUri: backend === "phoenixd" ? "" : data.nwcUri });
  };

  const handleUriChange = (val) => {
    setUriError("");
    onChange({ nwcUri: val, walletBackend: "nwc" });
    if (val && !NWC_URI_REGEX.test(val)) {
      setUriError(t("stepWallet.uriInvalid"));
    }
  };

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-green-900 mb-2">{t("stepWallet.title")}</h2>
      <p className="text-gray-500 mb-6">{t("stepWallet.subtitle")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card
          isPressable
          onPress={() => handleSelect("phoenixd")}
          className={`border-2 transition-colors cursor-pointer ${!isNwc ? "border-green-700 bg-green-50" : "border-gray-200"}`}
        >
          <CardBody className="flex flex-col items-center gap-3 py-6">
            <Server className={`w-8 h-8 ${!isNwc ? "text-green-700" : "text-gray-400"}`} />
            <div className="text-center">
              <p className={`font-semibold ${!isNwc ? "text-green-900" : "text-gray-700"}`}>phoenixd</p>
              <p className="text-xs text-gray-500 mt-1">{t("stepWallet.phoenixdDescription")}</p>
            </div>
          </CardBody>
        </Card>

        <Card
          isPressable
          onPress={() => handleSelect("nwc")}
          className={`border-2 transition-colors cursor-pointer ${isNwc ? "border-green-700 bg-green-50" : "border-gray-200"}`}
        >
          <CardBody className="flex flex-col items-center gap-3 py-6">
            <Zap className={`w-8 h-8 ${isNwc ? "text-green-700" : "text-gray-400"}`} />
            <div className="text-center">
              <p className={`font-semibold ${isNwc ? "text-green-900" : "text-gray-700"}`}>
                {t("stepWallet.nwcName")}
              </p>
              <p className="text-xs text-gray-500 mt-1">{t("stepWallet.nwcDescription")}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {isNwc && (
        <div className="space-y-3">
          <Input
            label={t("stepWallet.uriLabel")}
            placeholder="nostr+walletconnect://..."
            value={data.nwcUri || ""}
            onValueChange={handleUriChange}
            isInvalid={!!uriError}
            errorMessage={uriError}
            description={t("stepWallet.uriDescription")}
            classNames={{ input: "font-mono text-xs" }}
          />
          <p className="text-xs text-gray-400">{t("stepWallet.uriHint")}</p>
        </div>
      )}
    </div>
  );
}
