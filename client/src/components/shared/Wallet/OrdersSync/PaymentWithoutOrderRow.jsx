"use client";
import { Button, Card, CardBody } from "@heroui/react";
import { useTranslations } from "next-intl";

import { CopyableValueRow } from "@/components/shared/CopyableValueRow";
import formatDate from "@/lib/formatDate";

export function PaymentWithoutOrderRow({ paymentWithoutOrder, onReview }) {
  const walletTranslations = useTranslations("wallet");

  return (
    <Card className="border" shadow="none">
      <CardBody className="p-4 space-y-2">
        <div className="text-xs text-gray-700">
          <p>
            {walletTranslations("ordersSync.paymentWithoutOrderRow.amountLabel")}: {paymentWithoutOrder.receivedSat} sats
          </p>
          <p>
            {walletTranslations("ordersSync.paymentWithoutOrderRow.dateLabel")}: {formatDate(paymentWithoutOrder.completedAt)}
          </p>
        </div>
        <CopyableValueRow
          label={walletTranslations("ordersSync.paymentWithoutOrderRow.paymentHashLabel")}
          fullValue={paymentWithoutOrder.paymentHash}
          copyLabel={walletTranslations("ordersSync.paymentWithoutOrderRow.copy")}
        />
        <Button
          size="sm"
          color="primary"
          className="bg-green-800 self-start"
          onPress={() => onReview(paymentWithoutOrder)}
        >
          {walletTranslations("ordersSync.paymentWithoutOrderRow.reviewButton")}
        </Button>
      </CardBody>
    </Card>
  );
}
