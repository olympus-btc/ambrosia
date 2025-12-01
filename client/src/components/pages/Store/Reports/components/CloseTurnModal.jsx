"use client";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Button, Card, CardBody } from "@heroui/react";
import { AlertCircle, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

export function CloseTurnModal({
  isOpen,
  onClose,
  onConfirm,
  reportData,
  formatCurrency,
  confirmLoading = false,
}) {
  const t = useTranslations("reports");
  return (
    <Modal isOpen={isOpen} onClose={onClose} backdrop="blur">
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-red-600" />
            <span>{t("close.modalTitle")}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span className="text-deep font-medium">
                {t("close.modalQuestion")}
              </span>
            </div>
            <p className="text-forest text-sm">
              {t("close.modalDesc")}
            </p>
            {reportData && (
              <Card className="bg-blue-50 border-blue-200">
                <CardBody className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700 font-medium">{t("close.modalPeriodBalance")}</span>
                    <span className="text-blue-900 font-bold">
                      {formatCurrency(reportData.totalBalance)}
                    </span>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" color="default" onPress={onClose}>
            {t("close.cancel")}
          </Button>
          <Button variant="solid" color="danger" onPress={onConfirm} isDisabled={confirmLoading}>
            <Lock className="w-4 h-4 mr-1" />
            {confirmLoading ? t("close.confirming") : t("close.confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
