"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import { AmountDisplay } from "@/components/shared/AmountDisplay";
import formatDate from "@lib/formatDate";

import { StatusChip } from "./OrdersList/StatusChip";

export function OrderDetailsModal({ order, isOpen, onClose, formatAmount, currentRate }) {
  const t = useTranslations("orders");
  const {
    id,
    userName,
    status,
    paymentMethod,
    total,
    createdAt,
    satoshiAmount,
    exchangeRateAtPayment,
    exchangeRateCurrency,
    fiatAmountAtPayment,
  } = order ?? {};

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
      backdrop="blur"
      shouldBlockScroll={false}
      classNames={{
        backdrop: "backdrop-blur-xs bg-white/10",
        wrapper: "items-start h-auto",
        base: "my-auto overflow-hidden",
        body: "overflow-y-auto max-h-[65vh]",
      }}
    >
      <ModalContent>
        <ModalHeader>{t("details.title")}</ModalHeader>
        <ModalBody>
          <div className="space-y-3 text-sm text-deep">
            <DetailRow label={t("details.id")} value={id} />
            <DetailRow label={t("details.user")} value={userName ?? t("details.unassigned")} />
            <DetailRow
              label={t("details.status")}
              value={status ? <StatusChip status={status} /> : t("details.unassigned")}
            />
            <DetailRow
              label={t("details.paymentMethod")}
              value={paymentMethod || t("details.noPayment")}
            />
            <DetailRow
              label={t("details.total")}
              value={
                satoshiAmount != null
                  ? (
                    <AmountDisplay
                      satoshis={satoshiAmount}
                      exchangeRateAtSale={exchangeRateAtPayment}
                      exchangeRateCurrency={exchangeRateCurrency}
                      fiatAmountAtPayment={fiatAmountAtPayment}
                      currentRate={currentRate}
                    /> ?? formatAmount(total * 100)
                    )
                  : formatAmount(total * 100 ?? 0)
              }
            />
            <DetailRow
              label={t("details.createdAt")}
              value={createdAt ? formatDate(createdAt) : t("details.unassigned")}
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
