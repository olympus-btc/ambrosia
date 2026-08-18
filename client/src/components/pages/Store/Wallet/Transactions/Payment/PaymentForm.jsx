"use client";

import { useState, useRef } from "react";

import { Button, Input, addToast, Spinner } from "@heroui/react";
import jsQR from "jsqr";
import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";

export function PaymentForm({
  invoiceValidationError,
  isLoading,
  payInvoice,
  onInvoiceChange,
  onSubmit,
}) {
  const walletTranslations = useTranslations("wallet");
  const [isScanning, setIsScanning] = useState(false);
  const [isTouchDevice] = useState(() => typeof window !== "undefined" && navigator.maxTouchPoints > 0);
  const cameraInputRef = useRef(null);

  const handleCameraScan = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = (fileEvent) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const canvasContext = canvas.getContext("2d", { willReadFrequently: true });

          const MAX_SIZE = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          canvasContext.drawImage(img, 0, 0, width, height);

          const imageData = canvasContext.getImageData(0, 0, width, height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

          if (qrCode) {
            const cleanInvoice = qrCode.data.replace(/^lightning:/i, "").trim();

            if (!cleanInvoice.toLowerCase().startsWith("ln")) {
              addToast({
                title: walletTranslations("payments.send.qrInvalidTitle"),
                description: walletTranslations("payments.send.qrInvalidDescription"),
                color: "danger",
              });
              setIsScanning(false);
              return;
            }

            onInvoiceChange(cleanInvoice);
            addToast({
              title: walletTranslations("payments.send.qrScannedTitle"),
              description: walletTranslations("payments.send.qrScannedDescription"),
              color: "success",
            });
          } else {
            addToast({
              title: walletTranslations("payments.send.qrScanFailedTitle"),
              description: walletTranslations("payments.send.qrScanFailedDescription"),
              color: "danger",
            });
          }
          setIsScanning(false);
        };
        img.src = fileEvent.target.result;
      };
      reader.readAsDataURL(file);
    } catch (qrScanError) {
      console.error("QR Scan Error:", qrScanError);
      setIsScanning(false);
    } finally {
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-2 items-end">
        <Input
          label={walletTranslations("payments.send.payInvoiceLabel")}
          placeholder="lnbc1..."
          value={payInvoice}
          onChange={(event) => onInvoiceChange(event.target.value)}
          isDisabled={isLoading || isScanning}
          isInvalid={Boolean(invoiceValidationError)}
          errorMessage={invoiceValidationError}
          className="flex-1"
        />
        {isTouchDevice && (
          <>
            <Button
              isIconOnly
              aria-label={walletTranslations("payments.send.scanQRButton")}
              onPress={() => cameraInputRef.current?.click()}
              isDisabled={isLoading || isScanning}
              className="h-14 w-14 min-w-14 bg-forest text-white shadow-md hover:opacity-90 transition-opacity"
            >
              {isScanning ? <Spinner size="sm" color="current" /> : <Camera className="h-6 w-6" />}
            </Button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraScan}
              className="hidden"
            />
          </>
        )}
      </div>
      <Button
        onPress={onSubmit}
        color="primary"
        size="lg"
        isLoading={isLoading}
        isDisabled={isScanning}
        className="w-full bg-forest text-white"
      >
        {isLoading ? walletTranslations("payments.send.payLightningLoading") : walletTranslations("payments.send.payLightningButton")}
      </Button>
    </div>
  );
}
