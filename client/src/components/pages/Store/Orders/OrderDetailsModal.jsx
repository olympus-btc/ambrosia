"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import formatDate from "@/lib/formatDate";

import { StatusChip } from "./StatusChip";

export function OrderDetailsModal({ order, isOpen, onClose, formatAmount }) {
  const t = useTranslations("orders");
  const waiterLabel = order?.waiter ?? t("details.unassigned");

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
      backdrop="blur"
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
      }}
    >
      <ModalContent>
        <ModalHeader>{t("details.title")}</ModalHeader>
        <ModalBody>
          <div className="space-y-3 text-sm text-deep">
            <DetailRow label={t("details.id")} value={order?.id} />
            <DetailRow label={t("details.user")} value={waiterLabel} />
            <DetailRow
              label={t("details.status")}
              value={order ? <StatusChip status={order.status} /> : t("details.unassigned")}
            />
            <DetailRow
              label={t("details.paymentMethod")}
              value={order?.payment_method || t("details.noPayment")}
            />
            <DetailRow
              label={t("details.total")}
              value={order ? formatAmount(order.total * 100 ?? 0) : t("details.unassigned")}
            />
            <DetailRow
              label={t("details.createdAt")}
              value={order?.created_at ? formatDate(order.created_at) : t("details.unassigned")}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            variant="bordered"
            onPress={onClose}
          >
            {t("details.close")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold wrap-break-words text-right">{value}</span>
    </div>
  );
}
