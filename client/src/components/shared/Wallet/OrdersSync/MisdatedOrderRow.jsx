"use client";
import { useState } from "react";

import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";

import formatDate from "@/lib/formatDate";
import { correctMisdatedOrder } from "@/services/ordersSyncService";

export function MisdatedOrderRow({ misdatedOrder, onCorrected }) {
  const walletTranslations = useTranslations("wallet");
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [correctionError, setCorrectionError] = useState(null);

  const handleConfirmCorrection = async () => {
    setIsCorrecting(true);
    setCorrectionError(null);
    try {
      await correctMisdatedOrder(misdatedOrder.paymentId);
      onCorrected();
    } catch (correctMisdatedOrderError) {
      setCorrectionError(correctMisdatedOrderError);
    } finally {
      setIsCorrecting(false);
    }
  };

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 p-2">
      <div className="text-xs text-gray-700">
        <p>
          {walletTranslations("ordersSync.misdatedOrderRow.recordedDateLabel")}: {formatDate(misdatedOrder.recordedDate)}
        </p>
        <p>
          {walletTranslations("ordersSync.misdatedOrderRow.actualDateLabel")}: {formatDate(misdatedOrder.actualCompletedAt)}
        </p>
        {correctionError && (
          <p className="text-rose-600">{walletTranslations("ordersSync.misdatedOrderRow.correctionError")}</p>
        )}
      </div>
      <Button
        size="sm"
        color="primary"
        className="bg-green-800"
        isLoading={isCorrecting}
        onPress={handleConfirmCorrection}
      >
        {walletTranslations("ordersSync.misdatedOrderRow.confirmButton")}
      </Button>
    </li>
  );
}
