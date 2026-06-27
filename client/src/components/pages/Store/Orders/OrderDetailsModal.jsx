"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { CopyButton } from "@/components/shared/CopyButton";
import { OrderProductsTable } from "@/components/shared/OrderProductsTable";
import formatDate from "@lib/formatDate";

import { StatusChip } from "./OrdersList/StatusChip";

export function OrderDetailsModal({ order, isOpen, onClose, formatAmount, currentRate }) {
  const ordersTranslations = useTranslations("orders");
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
    paymentHash,
    items,
  } = order ?? {};

  return (
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

            </div>
          )}
        </ModalBody>
        <ModalFooter>
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
  );
}

function MetaField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function HashRow({ label, value, copyLabel }) {
  const truncated = `${value.slice(0, 12)}…${value.slice(-8)}`;
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-gray-700" title={value}>{truncated}</span>
        <CopyButton value={value} label={copyLabel} size="sm" />
      </div>
    </div>
  );
}
