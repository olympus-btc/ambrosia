"use client";

import { useState } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { OrderProductsTable } from "@/components/shared/OrderProductsTable";
import { StatusChip } from "@/components/shared/StatusChip";
import { usePermission } from "@/hooks/usePermission";
import formatDate from "@lib/formatDate";

import { RefundModal } from "../RefundModal";

import { HashRow } from "./HashRow";
import { MetaField } from "./MetaField";
import { RefundInfo } from "./RefundInfo";

export function OrderDetailsModal({ order, isOpen, onClose, onRefunded, formatAmount, currentRate }) {
  const ordersTranslations = useTranslations("orders");
  const canRefund = usePermission({ allOf: ["orders_refund"] });
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const {
    id,
    userName,
    status,
    paymentMethod,
    total,
    discountAmount,
    createdAt,
    satoshiAmount,
    exchangeRateAtPayment,
    exchangeRateCurrency,
    fiatAmountAtPayment,
    paymentHash,
    items,
    refund,
  } = order ?? {};

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={onClose}
        size="md"
        scrollBehavior="inside"
        backdrop="blur"
        classNames={{
          backdrop: "backdrop-blur-xs bg-white/10",
          base: "my-auto",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-0.5 pb-2">
            <span>{ordersTranslations("details.title")}</span>
            {id && <span className="font-mono text-sm font-normal text-gray-400">#{id.slice(0, 8)}</span>}
          </ModalHeader>
          <ModalBody className="pb-6">
            {order && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <MetaField
                    label={ordersTranslations("details.createdAt")}
                    value={createdAt ? formatDate(createdAt) : "—"}
                  />
                  <MetaField label={ordersTranslations("details.user")} value={userName ?? "—"} />
                  <MetaField
                    label={ordersTranslations("details.paymentMethod")}
                    value={paymentMethod || ordersTranslations("details.noPayment")}
                  />
                  <MetaField
                    label={ordersTranslations("details.status")}
                    value={status ? <StatusChip status={status} /> : "—"}
                  />
                  {paymentHash && (
                    <div className="col-span-2">
                      <HashRow
                        label={ordersTranslations("details.lightning.paymentHash")}
                        value={paymentHash}
                        copyLabel={ordersTranslations("details.lightning.copy")}
                      />
                    </div>
                  )}
                </div>

                {items?.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <OrderProductsTable
                      items={items}
                      formatAmount={formatAmount}
                      labels={{
                        products: ordersTranslations("details.products"),
                        quantity: ordersTranslations("details.quantity"),
                        unitPrice: ordersTranslations("details.unitPrice"),
                        subtotal: ordersTranslations("details.subtotal"),
                      }}
                    />
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-sm text-red-600">
                    <span>{ordersTranslations("details.discount")}</span>
                    <span>-{formatAmount(discountAmount)}</span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                  <span className="font-semibold text-sm">{ordersTranslations("details.total")}</span>
                  <div className="font-bold text-green-700">
                    {satoshiAmount != null
                      ? (
                        <AmountDisplay
                          satoshis={satoshiAmount}
                          exchangeRateAtSale={exchangeRateAtPayment}
                          exchangeRateCurrency={exchangeRateCurrency}
                          fiatAmountAtPayment={fiatAmountAtPayment}
                          currentRate={currentRate}
                        /> ?? formatAmount(total * 100)
                        )
                      : formatAmount(total * 100 ?? 0)}
                  </div>
                </div>

                {refund && (
                  <RefundInfo
                    refund={refund}
                    refundedAtLabel={ordersTranslations("details.refundedAt")}
                    amountLabel={ordersTranslations("details.refundAmountLabel")}
                    satsLabel={ordersTranslations("details.sats")}
                    invoiceLabel={ordersTranslations("details.refundInvoice")}
                    copyLabel={ordersTranslations("details.lightning.copy")}
                  />
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter className="flex justify-between">
            {status === "paid" && canRefund && (
              <Button color="danger" onPress={() => setIsRefundOpen(true)}>
                {ordersTranslations("details.refund")}
              </Button>
            )}
            <Button
              className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              variant="bordered"
              onPress={onClose}
            >
              {ordersTranslations("details.close")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <RefundModal
        order={order}
        isOpen={isRefundOpen}
        onClose={() => setIsRefundOpen(false)}
        onRefunded={() => {
          setIsRefundOpen(false);
          onRefunded?.();
        }}
        formatAmount={formatAmount}
      />
    </>
  );
}
