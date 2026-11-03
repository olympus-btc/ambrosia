import { useMemo } from "react";

import { useTranslations } from "next-intl";

export function useTicketLabels() {
  const ticketPrintTranslations = useTranslations("ticketPrint");

  return useMemo(() => ({
    total: ticketPrintTranslations("labels.total"),
    discount: ticketPrintTranslations("labels.discount"),
    tip: ticketPrintTranslations("labels.tip"),
    paymentMethod: ticketPrintTranslations("labels.paymentMethod"),
  }), [ticketPrintTranslations]);
}
