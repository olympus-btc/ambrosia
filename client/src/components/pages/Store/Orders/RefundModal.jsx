"use client";

import { useState } from "react";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
  Checkbox,
  addToast,
} from "@heroui/react";
import { useTranslations } from "next-intl";

import { classifyPaymentMethod, PAYMENT_METHODS } from "@/components/pages/Store/Cart/utils/paymentMethods";
import { buildParsedHttpError } from "@/components/pages/Store/utils/buildHttpError";
import { httpClient } from "@/lib/http";
import { getBolt11ValidationErrorCode } from "@/utils/validateBolt11Invoice";

import { CashRefundFields } from "./CashRefundFields";
import { getRefundErrorDescription } from "./utils/refundErrors";

function getInvoiceErrorMessage(invoiceValue, translate) {
  const hasFormatError = getBolt11ValidationErrorCode(invoiceValue) !== "";
  return hasFormatError ? translate("details.refundInvoiceInvalid") : "";
}

export function RefundModal({ order, isOpen, onClose, onRefunded, formatAmount }) {
  const ordersTranslations = useTranslations("orders");
  const [invoice, setInvoice] = useState("");
  const [invoiceError, setInvoiceError] = useState("");
  const [cashGiven, setCashGiven] = useState(0);
  const [externalRefundAcknowledged, setExternalRefundAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);

  const isBtcOrder = order?.satoshiAmount != null;
  const orderPaymentMethod = classifyPaymentMethod(order?.paymentMethod);
  const isCashOrder = !isBtcOrder && orderPaymentMethod === PAYMENT_METHODS.CASH;
  const isTransferOrder = !isBtcOrder && orderPaymentMethod === PAYMENT_METHODS.TRANSFER;
  const isCardOrder = !isBtcOrder && !isCashOrder && !isTransferOrder;
  const externalRefundTranslationKeys = isTransferOrder
    ? { notice: "details.refundTransferNotice", acknowledge: "details.refundTransferAcknowledge" }
    : { notice: "details.refundCardNotice", acknowledge: "details.refundCardAcknowledge" };
  const orderTotalCents = Math.round((order?.total ?? 0) * 100);
  const cashGivenCents = Math.round((cashGiven || 0) * 100);
  const cashDifferenceCents = cashGivenCents - orderTotalCents;
  const isCashAmountExact = cashDifferenceCents === 0;

  let isConfirmDisabled = false;
  if (isBtcOrder) {
    isConfirmDisabled = !invoice.trim();
  } else if (isCashOrder) {
    isConfirmDisabled = !isCashAmountExact;
  } else if (isCardOrder || isTransferOrder) {
    isConfirmDisabled = !externalRefundAcknowledged;
  }

  function handleInvoiceChange(value) {
    setInvoice(value);
    setInvoiceError("");
  }

  async function handleRefund() {
    if (loading) return;

    if (isBtcOrder) {
      const errorMessage = getInvoiceErrorMessage(invoice, ordersTranslations);
      if (errorMessage) {
        setInvoiceError(errorMessage);
        return;
      }
    }

    setLoading(true);
    try {
      const refundResponse = await httpClient(`/store/orders/${order.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice: isBtcOrder ? invoice.trim() : "" }),
        skipForbiddenRedirect: true,
      });

      if (refundResponse.ok === false) {
        throw await buildParsedHttpError(refundResponse, ordersTranslations("details.refundError"));
      }

      addToast({
        color: "success",
        description: ordersTranslations("details.refundSuccess"),
      });
      setInvoice("");
      onRefunded();
    } catch (refundError) {
      addToast({
        color: "danger",
        description: getRefundErrorDescription(ordersTranslations, refundError),
      });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;

    setInvoice("");
    setInvoiceError("");
    setCashGiven(0);
    setExternalRefundAcknowledged(false);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleClose}
      size="sm"
      backdrop="blur"
      classNames={{ backdrop: "backdrop-blur-xs bg-white/10", base: "my-auto" }}
    >
      <ModalContent>
        <ModalHeader>{ordersTranslations("details.refundTitle")}</ModalHeader>
        <ModalBody className="pt-0">
          <p className="text-sm text-gray-600 mb-3">
            {ordersTranslations("details.refundDescription")}
          </p>
          {isBtcOrder && (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {ordersTranslations("details.refundAmountLabel")}:{" "}
                <span className="font-mono">
                  {order.satoshiAmount} {ordersTranslations("details.sats")}
                </span>
              </p>
              <Textarea
                label={ordersTranslations("details.refundInvoiceLabel")}
                placeholder={ordersTranslations("details.refundInvoicePlaceholder")}
                value={invoice}
                onValueChange={handleInvoiceChange}
                isInvalid={Boolean(invoiceError)}
                errorMessage={invoiceError}
                minRows={3}
                classNames={{ inputWrapper: "shadow-none" }}
              />
            </div>
          )}
          {isCashOrder && (
            <CashRefundFields
              orderTotalCents={orderTotalCents}
              cashGiven={cashGiven}
              onCashGivenChange={(value) => setCashGiven(value ?? 0)}
              cashDifferenceCents={cashDifferenceCents}
              isCashAmountExact={isCashAmountExact}
              formatAmount={formatAmount}
            />
          )}
          {(isCardOrder || isTransferOrder) && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {ordersTranslations(externalRefundTranslationKeys.notice)}
              </p>
              <Checkbox isSelected={externalRefundAcknowledged} onValueChange={setExternalRefundAcknowledged}>
                {ordersTranslations(externalRefundTranslationKeys.acknowledge)}
              </Checkbox>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex justify-between">
          <Button
            className="px-6 py-2 border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            variant="bordered"
            onPress={handleClose}
            isDisabled={loading}
          >
            {ordersTranslations("details.close")}
          </Button>
          <Button
            color="danger"
            isLoading={loading}
            isDisabled={isConfirmDisabled}
            onPress={handleRefund}
          >
            {ordersTranslations("details.refundConfirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
