"use client";

import { useEffect, useState } from "react";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";

import { isElectron } from "@lib/isElectron";

const METADATA_TIMEOUT_MS = 8000;
const SHA256_FINGERPRINT_PATTERN = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;

function validMetadata(trustMetadata, expectedHostname) {
  if (trustMetadata?.schemaVersion !== 1 || trustMetadata.hostname !== expectedHostname) return false;

  const requiredFields = ["subject", "displayName", "sha256", "notBefore", "notAfter"];
  function isPopulatedString(fieldName) {
    return typeof trustMetadata[fieldName] === "string" && trustMetadata[fieldName].trim();
  }
  if (!requiredFields.every(isPopulatedString)) return false;

  const issuedAt = Date.parse(trustMetadata.notBefore);
  const expiresAt = Date.parse(trustMetadata.notAfter);
  return SHA256_FINGERPRINT_PATTERN.test(trustMetadata.sha256) &&
    Number.isFinite(issuedAt) && Number.isFinite(expiresAt) && issuedAt < expiresAt;
}

export function SecureConnection() {
  const secureConnectionTranslations = useTranslations("settings.secureConnection");
  const [trustState, setTrustState] = useState(null);

  useEffect(() => {
    if (isElectron || !window.location.hostname.endsWith(".local")) return;
    const abortController = new AbortController();
    const currentHostname = window.location.hostname;
    const requestTimeout = window.setTimeout(() => abortController.abort(), METADATA_TIMEOUT_MS);
    let isMounted = true;

    async function loadTrustMetadata() {
      try {
        const metadataResponse = await fetch("/trust/metadata.json", {
          cache: "no-store",
          credentials: "omit",
          signal: abortController.signal,
        });
        if (metadataResponse.status === 404) return;
        if (!metadataResponse.ok) throw new Error("Trust metadata unavailable");
        const trustMetadata = await metadataResponse.json();
        if (!validMetadata(trustMetadata, currentHostname)) throw new Error("Invalid trust metadata");
        if (isMounted) {
          setTrustState({
            metadata: trustMetadata,
            hostname: currentHostname,
            isHttps: window.location.protocol === "https:",
          });
        }
      } catch {
        if (isMounted) setTrustState({ error: true });
      } finally {
        window.clearTimeout(requestTimeout);
      }
    }

    loadTrustMetadata();
    return () => {
      isMounted = false;
      window.clearTimeout(requestTimeout);
      abortController.abort();
    };
  }, []);

  if (!trustState) return null;

  return (
    <Card shadow="none" className="rounded-lg p-6 shadow-lg">
      <CardHeader className="flex flex-col items-start gap-2 pb-2">
        <h2 className="text-lg font-semibold text-green-900 sm:text-xl xl:text-2xl">{secureConnectionTranslations("title")}</h2>
        <p className="text-sm text-gray-500">{secureConnectionTranslations("subtitle")}</p>
      </CardHeader>
      <CardBody className="gap-4 pt-4">
        {trustState.error ? <p role="status">{secureConnectionTranslations("unavailable")}</p> : (
          <>
            <p>{secureConnectionTranslations(trustState.isHttps ? "httpsSession" : "httpSession")}</p>
            <p className="text-sm text-gray-600">{secureConnectionTranslations("sessionHint")}</p>
            <dl className="text-sm">
              <dt className="font-semibold">{trustState.metadata.displayName}</dt>
              <dd className="break-words">{trustState.metadata.subject}</dd>
              <dt className="mt-3 font-semibold">{secureConnectionTranslations("issued")}</dt>
              <dd>{new Date(trustState.metadata.notBefore).toLocaleDateString()}</dd>
              <dt className="mt-3 font-semibold">{secureConnectionTranslations("expires")}</dt>
              <dd>{new Date(trustState.metadata.notAfter).toLocaleDateString()}</dd>
              <dt className="mt-3 font-semibold">SHA-256</dt>
              <dd className="mt-1 break-all font-mono text-xs select-all">{trustState.metadata.sha256}</dd>
            </dl>
            <div className="mx-auto w-full max-w-56 rounded-xl border border-gray-200 bg-white p-4">
              <QRCode
                aria-label={secureConnectionTranslations("qrLabel")}
                value={`http://${trustState.hostname}/trust/`}
                size={224}
                fgColor="#14532D"
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            </div>
            <p className="text-sm text-gray-600">{secureConnectionTranslations("qrHint")}</p>
            <a href="/trust/" target="_blank" rel="noreferrer" className="text-green-800 underline">
              {secureConnectionTranslations("instructions")}
            </a>
          </>
        )}
      </CardBody>
    </Card>
  );
}
