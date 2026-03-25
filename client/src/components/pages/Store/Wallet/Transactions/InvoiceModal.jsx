"use client";

import {
  Button,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { CheckCircle } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { QRCode } from "react-qr-code";

import { CopyButton } from "@/components/shared/CopyButton";

export function InvoiceModal({ invoiceState, onClose }) {
  const t = useTranslations("wallet");
  const format = useFormatter();

  return (
    <Modal
      isOpen={invoiceState.showModal}
      onClose={onClose}
      size="2xl"
      backdrop="blur"
      classNames={{ backdrop: "backdrop-blur-xs bg-white/10" }}
    >
      <ModalContent>
        <ModalHeader>{t("invoiceModal.title")}</ModalHeader>
        <ModalBody>
          {invoiceState.paid ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle className="h-16 w-16 text-forest" />
              <div className="text-center space-y-1">
                <p className="text-xl font-semibold text-deep">
                  {t("invoiceModal.paymentReceived")}
                </p>
                {invoiceState.completedAt && (
                  <p className="text-sm text-gray-500">
                    {t("invoiceModal.paidAt", {
                      time: format.dateTime(new Date(invoiceState.completedAt), { timeStyle: "short" }),
                    })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            invoiceState.created && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg border w-full max-w-[280px]">
                    <QRCode
                      value={invoiceState.created.serialized}
                      style={{ width: "100%", height: "auto" }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">
                        {t("invoiceModal.invoice")}
                      </span>
                      <CopyButton
                        value={invoiceState.created.serialized}
                        label={t("invoiceModal.copyButton")}
                        size="sm"
                      />
                    </div>
                    <div className="bg-gray-100 rounded p-2 text-xs font-mono break-all">
                      {invoiceState.created.serialized}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">
                        {t("invoiceModal.paymentHash")}
                      </span>
                      <div className="flex items-center gap-2">
                        {invoiceState.awaitingPayment ? (
                          <div className="flex items-center space-x-2 text-sm text-forest">
                            <Spinner size="sm" color="success" />
                            <span>{t("invoiceModal.waitingPayment")}</span>
                          </div>
                        ) : null}
                        <CopyButton
                          value={invoiceState.created.paymentHash}
                          label={t("invoiceModal.copyButton")}
                          size="sm"
                        />
                      </div>
                    </div>
                    <div className="bg-gray-100 rounded p-2 text-xs font-mono break-all">
                      {invoiceState.created.paymentHash}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="bordered"
            type="button"
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onPress={onClose}
          >
            {t("invoiceModal.closeButton")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
