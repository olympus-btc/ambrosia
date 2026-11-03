import { useMemo } from "react";

import { useTranslations } from "next-intl";

import { usePaymentMethodLabel } from "@/hooks/usePaymentMethodLabel";
import { useTicketLabels } from "@/hooks/useTicketLabels";

import { sampleTicket } from "./sampleData";

export function useSampleTicket() {
  const sampleTranslations = useTranslations("ticketPrint.sample");
  const { getPaymentMethodLabel } = usePaymentMethodLabel();
  const ticketLabels = useTicketLabels();

  return useMemo(() => ({
    ...sampleTicket,
    tableName: sampleTranslations("tableName"),
    roomName: sampleTranslations("roomName"),
    items: [
      { quantity: 2, name: sampleTranslations("burger"), price: 90, comments: [sampleTranslations("noOnion")] },
      { quantity: 1, name: sampleTranslations("lemonade"), price: 35, comments: [] },
    ],
    paymentMethod: getPaymentMethodLabel(sampleTicket.paymentMethod),
    labels: ticketLabels,
  }), [sampleTranslations, getPaymentMethodLabel, ticketLabels]);
}
