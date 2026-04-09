import { useEffect, useRef, useState } from "react";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "@heroui/react";
import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCode } from "react-qr-code";

import { usePaymentWebsocket } from "@/hooks/usePaymentWebsocket";

import { useBitcoinInvoice } from "./hooks/useBitcoinInvoice";

export function BitcoinPaymentModal({
  isOpen,
  onClose,
  onComplete,
  onInvoiceReady,
  amountFiat,
  currencyAcronym = "usd",
  paymentId,
  invoiceDescription,
  displayTotal,
}) {
  const t = useTranslations("cart.paymentModal.bitcoin");
  const { setInvoiceHash, onPayment, connected } = usePaymentWebsocket();

  const [paymentReceived, setPaymentReceived] = useState(false);
  const [paymentAwaiting, setPaymentAwaiting] = useState(false);
  const [paymentCompletedAt, setPaymentCompletedAt] = useState(null);
  const [prevHash, setPrevHash] = useState(null);
  const completedRef = useRef(false);

  const {
    invoice,
    satsAmount,
    loading,
    error,
    generateInvoice,
    reset,
  } = useBitcoinInvoice({
    amountFiat: isOpen ? amountFiat : null,
    currencyAcronym,
    paymentId,
    invoiceDescription,
    autoGenerate: isOpen,
    onInvoiceReady,
  });

  const currentHash = invoice?.paymentHash;

  if (currentHash !== prevHash) {
    setPrevHash(currentHash);
    setPaymentReceived(false);
    setPaymentCompletedAt(null);
    setPaymentAwaiting(!!currentHash);
  }

  useEffect(() => {
    completedRef.current = false;

    if (currentHash) {
      setInvoiceHash(currentHash);
      const off = onPayment((data) => {
        if (data.paymentHash === currentHash && !completedRef.current) {
          completedRef.current = true;
          setPaymentReceived(true);
          setPaymentAwaiting(false);
          setPaymentCompletedAt(Date.now());
          onComplete?.({ invoice, satoshis: satsAmount, paymentId, auto: true });
        }
      });

      return () => {
        setInvoiceHash(null);
        off?.();
      };
    }
  }, [currentHash, invoice, satsAmount, paymentId, onComplete, onPayment, setInvoiceHash]);

  const handleClose = () => {
    reset();
    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      scrollBehavior="inside"
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col">
          <span className="text-base font-semibold text-green-900">
            {t("title")}
          </span>
          {!paymentReceived && (
            <span className="text-sm text-gray-600">
              {t("subtitle")}
            </span>
          )}
        </ModalHeader>
        <ModalBody className="space-y-4">
          {loading && !paymentReceived && (
            <div className="flex items-center justify-center py-6">
              <Spinner color="warning" label={t("generating")} />
            </div>
          )}

          {!loading && !paymentReceived && error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
              <p className="text-sm">{error}</p>
              <Button className="mt-3" color="warning" onPress={generateInvoice}>
                {t("retry")}
              </Button>
            </div>
          )}

          {!loading && !paymentReceived && !error && invoice && (
            <>
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border w-full max-w-60 sm:max-w-[280px] mx-auto">
                  <QRCode
                    value={invoice?.serialized || ""}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">{t("totalLabel")}</p>
                <p className="text-xl font-semibold text-green-900">
                  {displayTotal}
                </p>
                {satsAmount ? (
                  <p className="text-xs text-gray-500">{satsAmount} sats</p>
                ) : null}
              </div>
              {paymentAwaiting && (
                <div className="flex items-center justify-center space-x-2 text-sm text-forest">
                  <Spinner size="sm" color="success" />
                  <span>{t("waitingPayment")}</span>
                </div>
              )}
            </>
          )}

          {paymentReceived && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle className="h-16 w-16 text-forest" />
              <div className="text-center space-y-1">
                <p className="text-xl font-semibold text-deep">
                  {t("confirmed")}
                </p>
                {paymentCompletedAt && (
                  <p className="text-sm text-gray-500">
                    {t("paidAt", { time: new Date(paymentCompletedAt).toLocaleTimeString() })}
                  </p>
                )}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex justify-between">
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            isDisabled={loading}
            onPress={handleClose}
          >
            {paymentReceived ? t("close") : t("cancel")}
          </Button>
          {paymentAwaiting && !connected && (
            <Button
              color="primary"
              className="bg-green-800"
              onPress={() => {
                completedRef.current = true;
                setPaymentReceived(true);
                setPaymentAwaiting(false);
                setPaymentCompletedAt(Date.now());
                onComplete?.({ invoice, satoshis: satsAmount, paymentId, auto: false });
              }}
            >
              {t("markAsPaid")}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
