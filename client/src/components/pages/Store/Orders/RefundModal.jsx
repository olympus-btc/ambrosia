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
  const [cardRefundAcknowledged, setCardRefundAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);

  const isBtcOrder = order?.satoshiAmount != null;
  const isCashOrder = !isBtcOrder && order?.paymentMethod?.toLowerCase() === "cash";
  const isCardOrder = !isBtcOrder && !isCashOrder;
  const orderTotalCents = Math.round((order?.total ?? 0) * 100);
  const cashGivenCents = Math.round((cashGiven || 0) * 100);
  const cashDifferenceCents = cashGivenCents - orderTotalCents;
  const isCashAmountExact = cashDifferenceCents === 0;

  let isConfirmDisabled = false;
  if (isBtcOrder) {
    isConfirmDisabled = !invoice.trim();
  } else if (isCashOrder) {
    isConfirmDisabled = !isCashAmountExact;
  } else if (isCardOrder) {
    isConfirmDisabled = !cardRefundAcknowledged;
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
    setCardRefundAcknowledged(false);
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
          {isCardOrder && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {ordersTranslations("details.refundCardNotice")}
              </p>
              <Checkbox isSelected={cardRefundAcknowledged} onValueChange={setCardRefundAcknowledged}>
                {ordersTranslations("details.refundCardAcknowledge")}
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
