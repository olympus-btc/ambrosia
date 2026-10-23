import { useMemo } from "react";

import { useTranslations } from "next-intl";

import { useShiftReportLabels } from "@/hooks/useShiftReportLabels";

import { sampleShiftReport } from "./sampleData";

export function useSampleShiftReport() {
  const sampleTranslations = useTranslations("ticketPrint.sample");
  const shiftReportLabels = useShiftReportLabels();

  return useMemo(() => ({
    ...sampleShiftReport,
    cashierName: sampleTranslations("cashier"),
    labels: shiftReportLabels,
  }), [sampleTranslations, shiftReportLabels]);
}
