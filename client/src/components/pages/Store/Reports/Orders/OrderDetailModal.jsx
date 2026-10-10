"use client";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { useTranslations } from "next-intl";

import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { CopyableValueRow } from "@/components/shared/CopyableValueRow";
import { OrderProductsTable } from "@/components/shared/OrderProductsTable";
import { usePaymentMethodLabel } from "@/hooks/usePaymentMethodLabel";
import formatDate from "@lib/formatDate";

export function OrderDetailModal({ order, formatCurrency, currentRate, onClose }) {
  const reportsTranslations = useTranslations("reports");
  const { getPaymentMethodLabel } = usePaymentMethodLabel();
  const {
    shortId,
    date,
    userName,
    paymentMethod,
    items,
    total,
    discountAmount,
    satoshiAmount,
    exchangeRateAtPayment,
    exchangeRateCurrency,
    fiatAmountAtPayment,
    transactionId,
  } = order ?? {};

  return (
    <Modal
      isOpen={Boolean(order)}
      onClose={onClose}
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
          <span>{reportsTranslations("orders.detailTitle")}</span>
          {order && <span className="font-mono text-sm font-normal text-gray-400">#{shortId}</span>}
        </ModalHeader>
        <ModalBody className="pb-6">
          {order && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">{reportsTranslations("sales.date")}</p>
                  <p className="font-medium">{formatDate(date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{reportsTranslations("sales.user")}</p>
                  <p className="font-medium">{userName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{reportsTranslations("sales.paymentMethod")}</p>
                  <p className="font-medium">{getPaymentMethodLabel(paymentMethod) || reportsTranslations("payment.unknown")}</p>
                </div>
              </div>

              {transactionId && (
                <CopyableValueRow
                  label={reportsTranslations("orders.reference")}
                  fullValue={transactionId}
                  copyLabel={reportsTranslations("orders.copyReference")}
                />
              )}

              <div className="border-t border-gray-100 pt-3">
                <OrderProductsTable
                  items={items ?? []}
                  formatAmount={formatCurrency}
                  labels={{
                    products: reportsTranslations("orders.products"),
                    quantity: reportsTranslations("sales.quantity"),
                    unitPrice: reportsTranslations("sales.price"),
                    subtotal: reportsTranslations("orders.subtotal"),
                  }}
                />
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-sm text-red-600">
                  <span>{reportsTranslations("orders.discount")}</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="font-semibold text-sm">{reportsTranslations("orders.total")}</span>
                <div className="font-bold text-green-700">
                  {satoshiAmount != null
                    ? (
                      <AmountDisplay
                        satoshis={satoshiAmount}
                        exchangeRateAtSale={exchangeRateAtPayment}
                        exchangeRateCurrency={exchangeRateCurrency}
                        fiatAmountAtPayment={fiatAmountAtPayment}
                        currentRate={currentRate}
                      />
                      )
                    : formatCurrency(total)}
                </div>
              </div>
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
