"use client";

import { useState } from "react";

import { Card, CardBody, Input } from "@heroui/react";
import { Zap, Server } from "lucide-react";
import { useTranslations } from "next-intl";

import { NWC_URI_REGEX } from "@/lib/nwcUri";

export function WalletBackendStep({ data, onChange }) {
  const walletBackendTranslations = useTranslations();
  const [uriError, setUriError] = useState("");

  const isNwc = !!data.nwcUri || data.walletBackend === "nwc";

  const handleSelect = (backend) => {
    onChange({ walletBackend: backend, nwcUri: backend === "phoenixd" ? "" : data.nwcUri });
  };

  const handleUriChange = (val) => {
    setUriError("");
    onChange({ nwcUri: val, walletBackend: "nwc" });
    if (val && !NWC_URI_REGEX.test(val)) {
      setUriError(walletBackendTranslations("stepWallet.uriInvalid"));
    }
  };

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-green-900 mb-2">{walletBackendTranslations("stepWallet.title")}</h2>
      <p className="text-gray-500 mb-4 md:mb-8">{walletBackendTranslations("stepWallet.subtitle")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card
          shadow="none"
          isPressable
          onPress={() => handleSelect("phoenixd")}
          className={`border border-gray-200 rounded-lg hover:bg-green-200 ${!isNwc ? "bg-green-100 border-green-300" : ""}`}
        >
          <CardBody className="flex flex-col items-center gap-3 py-6">
            <Server className="w-8 h-8 text-green-800" />
            <div className="text-center">
              <p className="font-semibold text-green-900">phoenixd</p>
              <p className="text-xs text-gray-500 mt-1">{walletBackendTranslations("stepWallet.phoenixdDescription")}</p>
            </div>
          </CardBody>
        </Card>

        <Card
          shadow="none"
          isPressable
          onPress={() => handleSelect("nwc")}
          className={`border border-gray-200 rounded-lg hover:bg-green-200 ${isNwc ? "bg-green-100 border-green-300" : ""}`}
        >
          <CardBody className="flex flex-col items-center gap-3 py-6">
            <Zap className="w-8 h-8 text-green-800" />
            <div className="text-center">
              <p className="font-semibold text-green-900">
                {walletBackendTranslations("stepWallet.nwcName")}
              </p>
              <p className="text-xs text-gray-500 mt-1">{walletBackendTranslations("stepWallet.nwcDescription")}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {isNwc && (
        <div className="space-y-3">
          <Input
            label={walletBackendTranslations("stepWallet.uriLabel")}
            placeholder="nostr+walletconnect://..."
            value={data.nwcUri || ""}
            onValueChange={handleUriChange}
            isInvalid={!!uriError}
            errorMessage={uriError}
            description={walletBackendTranslations("stepWallet.uriDescription")}
            classNames={{ input: "font-mono text-xs" }}
          />
          <p className="text-xs text-gray-400">{walletBackendTranslations("stepWallet.uriHint")}</p>
        </div>
      )}
    </div>
  );
}
